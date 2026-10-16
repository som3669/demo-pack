/**
 * Themor's header extras: live search results under the search forms a theme names, and the
 * log-in window opened by the links it names. Settings come from `window.themorHeaderExtras`.
 */
( function () {
	const data = window.themorHeaderExtras || {};

	/* Live search. */
	const search = data.search;
	if ( search && search.selector && search.url ) {
		const i18n = search.i18n || {};
		let count = 0;

		const attach = ( form ) => {
			const field = form.querySelector( 'input[type="search"], input[name="s"]' );
			if ( ! field || form.dataset.themorLive ) {
				return;
			}
			form.dataset.themorLive = '1';
			const id = `themor-live-${ ++count }`;
			const box = document.createElement( 'div' );
			box.className = 'themor-hx-results';
			box.id = id;
			box.hidden = true;
			const status = document.createElement( 'p' );
			status.className = 'screen-reader-text';
			status.setAttribute( 'role', 'status' );
			form.classList.add( 'themor-hx-search' );
			form.append( box, status );
			field.setAttribute( 'aria-controls', id );
			field.setAttribute( 'aria-expanded', 'false' );
			field.setAttribute( 'autocomplete', 'off' );

			let timer = 0;
			let controller = null;
			const close = () => {
				box.hidden = true;
				field.setAttribute( 'aria-expanded', 'false' );
			};
			const show = ( result ) => {
				box.textContent = '';
				const list = document.createElement( 'ul' );
				( result.items || [] ).forEach( ( item ) => {
					const li = document.createElement( 'li' );
					const link = document.createElement( 'a' );
					link.href = item.url;
					link.className = 'themor-hx-results__item';
					if ( item.image ) {
						const img = document.createElement( 'img' );
						img.src = item.image;
						img.alt = '';
						img.width = 44;
						img.height = 44;
						img.loading = 'lazy';
						link.append( img );
					}
					const text = document.createElement( 'span' );
					text.className = 'themor-hx-results__text';
					const title = document.createElement( 'span' );
					title.className = 'themor-hx-results__title';
					title.textContent = item.title;
					const meta = document.createElement( 'span' );
					meta.className = 'themor-hx-results__meta';
					meta.textContent = [ item.type, item.price ].filter( Boolean ).join( ' · ' );
					text.append( title, meta );
					link.append( text );
					li.append( link );
					list.append( li );
				} );
				if ( result.items && result.items.length ) {
					box.append( list );
					const all = document.createElement( 'a' );
					all.href = result.more;
					all.className = 'themor-hx-results__all';
					all.textContent = i18n.all || '';
					box.append( all );
				} else {
					const none = document.createElement( 'p' );
					none.className = 'themor-hx-results__none';
					none.textContent = i18n.none || '';
					box.append( none );
				}
				status.textContent = result.items && result.items.length ? String( i18n.results || '%d' ).replace( '%d', result.total ) : i18n.none || '';
				box.hidden = false;
				field.setAttribute( 'aria-expanded', 'true' );
			};
			const ask = async () => {
				const terms = field.value.trim();
				if ( terms.length < 2 ) {
					close();
					return;
				}
				if ( controller ) {
					controller.abort();
				}
				controller = new AbortController();
				form.classList.add( 'is-searching' );
				try {
					const url = new URL( search.url, window.location.href );
					url.searchParams.set( 's', terms );
					const response = await fetch( url, { signal: controller.signal, credentials: 'same-origin' } );
					show( await response.json() );
				} catch ( error ) {
					if ( 'AbortError' !== error.name ) {
						close();
					}
				}
				form.classList.remove( 'is-searching' );
			};
			field.addEventListener( 'input', () => {
				window.clearTimeout( timer );
				timer = window.setTimeout( ask, 250 );
			} );
			field.addEventListener( 'keydown', ( event ) => {
				if ( 'Escape' === event.key && ! box.hidden ) {
					event.stopPropagation();
					close();
				}
				if ( 'ArrowDown' === event.key && ! box.hidden ) {
					const first = box.querySelector( 'a' );
					if ( first ) {
						event.preventDefault();
						first.focus();
					}
				}
			} );
			box.addEventListener( 'keydown', ( event ) => {
				const links = [ ...box.querySelectorAll( 'a' ) ];
				const at = links.indexOf( document.activeElement );
				if ( 'ArrowDown' === event.key || 'ArrowUp' === event.key ) {
					event.preventDefault();
					const next = links[ at + ( 'ArrowDown' === event.key ? 1 : -1 ) ];
					( next || field ).focus();
				}
				if ( 'Escape' === event.key ) {
					event.stopPropagation();
					close();
					field.focus();
				}
			} );
			document.addEventListener( 'click', ( event ) => {
				if ( ! form.contains( event.target ) ) {
					close();
				}
			} );
		};

		const scan = () => document.querySelectorAll( search.selector ).forEach( attach );
		scan();
		// Forms the theme adds later (a dialog's, a header drawn again in the Customizer).
		new MutationObserver( scan ).observe( document.body, { childList: true, subtree: true } );
	}

	/* The log-in window. */
	const login = data.login;
	const dialog = login && login.id ? document.getElementById( login.id ) : null;
	if ( dialog && login.selector ) {
		document.addEventListener( 'click', ( event ) => {
			const opener = event.target.closest && event.target.closest( login.selector );
			if ( opener ) {
				event.preventDefault();
				dialog.showModal();
				const user = dialog.querySelector( 'input[type="text"], input[type="email"]' );
				if ( user ) {
					user.focus();
				}
				dialog.addEventListener( 'close', () => opener.focus(), { once: true } );
				return;
			}
			if ( event.target === dialog || ( event.target.closest && event.target.closest( '[data-themor-hx-close]' ) ) ) {
				dialog.close();
			}
		} );
	}

	/* The header, while it stays on screen: how far down the page it reaches. */
	const headerBottom = ( selector ) => {
		const header = selector ? document.querySelector( selector ) : null;
		const adminBar = parseFloat( getComputedStyle( document.documentElement ).getPropertyValue( '--wp-admin--admin-bar--height' ) ) || 0;
		if ( ! header || ! [ 'sticky', 'fixed' ].includes( getComputedStyle( header ).position ) ) {
			return adminBar;
		}
		return Math.max( adminBar, Math.round( header.getBoundingClientRect().bottom ) );
	};

	/* The date and time, in the site's time zone and language, kept current. */
	const clock = data.clock;
	const clocks = clock ? document.querySelectorAll( '[data-themor-clock]' ) : [];
	if ( clocks.length && window.Intl ) {
		const formats = {
			date: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
			time: { hour: 'numeric', minute: '2-digit' },
		};
		const format = ( options, date ) => {
			try {
				return new Intl.DateTimeFormat( clock.locale, { ...options, timeZone: 'UTC' } ).format( date );
			} catch ( error ) {
				return new Intl.DateTimeFormat( undefined, { ...options, timeZone: 'UTC' } ).format( date );
			}
		};
		const tick = () => {
			// The site's wall clock, read as UTC so the visitor's own time zone plays no part.
			const now = new Date( Date.now() + ( clock.offset || 0 ) * 60000 );
			clocks.forEach( ( item ) => {
				const show = item.dataset.themorClock;
				const parts = [];
				if ( 'time' !== show ) {
					parts.push( format( formats.date, now ) );
				}
				if ( 'date' !== show ) {
					parts.push( format( formats.time, now ) );
				}
				const time = item.querySelector( 'time' );
				if ( time ) {
					time.textContent = parts.join( ' · ' );
				}
			} );
		};
		tick();
		window.setInterval( tick, 15000 );
	}

	/* The scroll progress bar: how far down the page the visitor is, under a header that stays. */
	const progress = data.progress ? document.querySelector( '.themor-hx-progress' ) : null;
	if ( progress ) {
		let queued = false;
		const update = () => {
			queued = false;
			const root = document.documentElement;
			const height = root.scrollHeight - window.innerHeight;
			progress.style.setProperty( '--themor-hx-progress', height > 0 ? Math.min( 1, window.scrollY / height ).toFixed( 4 ) : '0' );
			progress.style.setProperty( '--themor-hx-progress-top', `${ headerBottom( data.progress.header ) }px` );
		};
		const queue = () => {
			if ( ! queued ) {
				queued = true;
				window.requestAnimationFrame( update );
			}
		};
		window.addEventListener( 'scroll', queue, { passive: true } );
		window.addEventListener( 'resize', queue, { passive: true } );
		update();
	}

	/* Smooth scrolling to a part of the page, stopping below a header that stays on screen. */
	if ( data.smooth ) {
		const root = document.documentElement;
		root.classList.add( 'themor-hx-smooth' );
		const offset = () => root.style.setProperty( '--themor-hx-offset', `${ headerBottom( data.smooth.header ) + 16 }px` );
		window.addEventListener( 'resize', offset, { passive: true } );
		window.addEventListener( 'scroll', offset, { passive: true } );
		offset();
	}
} )();
