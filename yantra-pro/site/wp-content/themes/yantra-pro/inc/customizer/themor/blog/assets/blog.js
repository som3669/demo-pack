/**
 * Themor's blog module: the featured posts slider's buttons, "Load more" and infinite scroll,
 * the reading progress bar, the share buttons' "Copy link" and their bar beside the post, and
 * the post's view count. Settings come from
 * `window.themorBlog` (Blog::enqueue()).
 */
( function () {
	const data = window.themorBlog || {};
	const i18n = data.i18n || {};
	const list = data.list || {};

	/* The featured posts slider: the buttons move one slide; each ends where the slides do. */
	document.querySelectorAll( '.themor-featured' ).forEach( ( slider ) => {
		const track = slider.querySelector( '.themor-featured__track' );
		const buttons = slider.querySelectorAll( '[data-themor-slide]' );
		if ( ! track || ! buttons.length ) {
			return;
		}
		const rtl = 'rtl' === getComputedStyle( track ).direction;
		const update = () => {
			const scrolled = Math.abs( track.scrollLeft );
			const end = track.scrollWidth - track.clientWidth - 2;
			buttons.forEach( ( button ) => {
				const forward = '1' === button.getAttribute( 'data-themor-slide' );
				button.disabled = forward ? scrolled >= end : scrolled <= 2;
			} );
		};
		buttons.forEach( ( button ) => {
			button.addEventListener( 'click', () => {
				const step = Number( button.getAttribute( 'data-themor-slide' ) ) * track.clientWidth;
				track.scrollBy( { left: rtl ? -step : step } );
			} );
		} );
		track.addEventListener( 'scroll', update, { passive: true } );
		track.addEventListener( 'keydown', ( event ) => {
			if ( 'ArrowRight' === event.key || 'ArrowLeft' === event.key ) {
				// The arrow's way on screen, in either direction of text.
				event.preventDefault();
				track.scrollBy( { left: ( 'ArrowRight' === event.key ? 1 : -1 ) * track.clientWidth } );
			}
		} );
		update();
	} );

	/* "Load more" and infinite scroll, over the list's own page links. */
	const container = list.container ? document.querySelector( list.container ) : null;
	const pager = list.pagination ? document.querySelector( list.pagination ) : null;
	const nextLink = pager && list.next ? pager.querySelector( list.next ) : null;
	let next = nextLink ? nextLink.href : '';

	if ( container && pager && next && ( 'load-more' === data.pagination || 'infinite' === data.pagination ) ) {
		const wrap = document.createElement( 'div' );
		wrap.className = 'themor-blog-more';
		wrap.innerHTML = `<button type="button" class="button wp-element-button">${ i18n.loadMore || '' }</button>`;
		const button = wrap.firstElementChild;
		pager.hidden = true;
		pager.before( wrap );

		let busy = false;
		const more = async () => {
			if ( busy || ! next ) {
				return;
			}
			busy = true;
			button.setAttribute( 'aria-busy', 'true' );
			button.textContent = i18n.loading || '';
			try {
				const response = await fetch( next, { credentials: 'same-origin' } );
				const page = new DOMParser().parseFromString( await response.text(), 'text/html' );
				const items = page.querySelector( list.container );
				if ( items ) {
					[ ...items.children ].forEach( ( item ) => container.append( document.importNode( item, true ) ) );
				}
				const pages = page.querySelector( list.pagination );
				const link = pages ? pages.querySelector( list.next ) : null;
				next = link ? link.href : '';
			} catch ( error ) {
				next = '';
				pager.hidden = false;
			}
			busy = false;
			button.removeAttribute( 'aria-busy' );
			button.textContent = i18n.loadMore || '';
			if ( ! next ) {
				wrap.remove();
			}
		};

		button.addEventListener( 'click', more );
		if ( 'infinite' === data.pagination && 'IntersectionObserver' in window ) {
			new IntersectionObserver( ( entries ) => entries.some( ( entry ) => entry.isIntersecting ) && more(), { rootMargin: '600px 0px' } ).observe( wrap );
		}
	}

	/* The reading progress bar: how far down the page the reader is. */
	const progress = document.querySelector( '.themor-progress' );
	if ( progress ) {
		let ticking = false;
		const draw = () => {
			const total = document.documentElement.scrollHeight - window.innerHeight;
			const share = total > 0 ? Math.min( 1, Math.max( 0, window.scrollY / total ) ) : 1;
			progress.style.setProperty( '--themor-progress', share.toFixed( 4 ) );
			ticking = false;
		};
		window.addEventListener( 'scroll', () => {
			if ( ! ticking ) {
				ticking = true;
				window.requestAnimationFrame( draw );
			}
		}, { passive: true } );
		window.addEventListener( 'resize', draw );
		draw();
	}

	/* "Copy link". */
	document.addEventListener( 'click', async ( event ) => {
		const button = event.target.closest && event.target.closest( '[data-themor-copy]' );
		if ( ! button ) {
			return;
		}
		try {
			await navigator.clipboard.writeText( button.getAttribute( 'data-themor-copy' ) );
			const label = button.getAttribute( 'title' );
			button.classList.add( 'is-copied' );
			button.setAttribute( 'title', i18n.copied || label );
			const status = button.querySelector( '.screen-reader-text' );
			if ( status ) {
				status.setAttribute( 'role', 'status' );
				status.textContent = i18n.copied || label;
			}
			window.setTimeout( () => {
				button.classList.remove( 'is-copied' );
				button.setAttribute( 'title', label );
				if ( status ) {
					status.textContent = label;
				}
			}, 2000 );
		} catch ( error ) {
			window.prompt( '', button.getAttribute( 'data-themor-copy' ) );
		}
	} );

	/* Views: the post's view counted once per visit, from the browser so a page cache can't stop it. */

	const views = data.views;
	if ( views && views.url && ! /bot|crawl|spider/i.test( navigator.userAgent ) ) {
		const key = `themor-viewed-${ views.id }`;
		let counted = false;
		try {
			counted = Boolean( sessionStorage.getItem( key ) );
		} catch ( error ) {}
		if ( ! counted ) {
			const headers = views.nonce ? { 'X-WP-Nonce': views.nonce } : {};
			fetch( views.url, { method: 'POST', headers, credentials: 'same-origin', keepalive: true } ).catch( () => {} );
			try {
				sessionStorage.setItem( key, '1' );
			} catch ( error ) {}
		}
	}

	/* The share buttons beside the post: shown while it is read, until those after it come. */

	const floatBar = data.shareFloat ? document.querySelector( '.themor-share-float' ) : null;
	const inline = floatBar ? document.querySelector( '.themor-share' ) : null;
	const article = inline ? inline.parentElement : null;
	if ( floatBar && inline && article ) {
		let ticking = false;
		const place = () => {
			ticking = false;
			const box = article.getBoundingClientRect();
			const left = box.left - floatBar.offsetWidth - 32;
			const reading = box.top < window.innerHeight * 0.4 && inline.getBoundingClientRect().top > window.innerHeight;
			const shown = reading && left >= 8 && window.innerWidth >= 1200;
			floatBar.style.insetInlineStart = `${ Math.max( 8, left ) }px`;
			floatBar.hidden = false;
			floatBar.classList.toggle( 'is-shown', shown );
			floatBar.toggleAttribute( 'inert', ! shown );
		};
		const later = () => {
			if ( ! ticking ) {
				ticking = true;
				window.requestAnimationFrame( place );
			}
		};
		window.addEventListener( 'scroll', later, { passive: true } );
		window.addEventListener( 'resize', later, { passive: true } );
		place();
	}
} )();
