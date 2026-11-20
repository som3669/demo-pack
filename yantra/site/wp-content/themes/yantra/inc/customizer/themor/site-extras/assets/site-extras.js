/**
 * Themor's site extras: the announcement bar's close button and countdown, the footer reveal
 * (only while the footer fits the window), and the sidebar as a drawer below the tablet width.
 * Settings come from `window.themorSiteExtras` (SiteExtras::enqueue()).
 */
( function () {
	const data = window.themorSiteExtras || {};
	const i18n = data.i18n || {};
	const parts = data.parts || {};

	/* The announcement bar. */

	const bar = document.getElementById( 'themor-announce' );
	if ( bar ) {
		const key = bar.getAttribute( 'data-themor-announce' );
		bar.addEventListener( 'click', ( event ) => {
			if ( ! event.target.closest( '[data-themor-announce-close]' ) ) {
				return;
			}
			bar.hidden = true;
			try {
				localStorage.setItem( key, '1' );
			} catch ( error ) {}
		} );

		const count = bar.querySelector( '[data-themor-countdown]' );
		if ( count ) {
			const end = Number( count.getAttribute( 'data-themor-countdown' ) ) * 1000;
			const pad = ( number ) => String( number ).padStart( 2, '0' );
			let timer = 0;
			const tick = () => {
				const left = Math.max( 0, end - Date.now() );
				if ( ! left ) {
					bar.hidden = true;
					window.clearInterval( timer );
					return;
				}
				const seconds = Math.floor( left / 1000 );
				count.textContent = ( i18n.countdown || '%1$sd %2$sh %3$sm %4$ss' )
					.replace( '%1$s', String( Math.floor( seconds / 86400 ) ) )
					.replace( '%2$s', pad( Math.floor( ( seconds % 86400 ) / 3600 ) ) )
					.replace( '%3$s', pad( Math.floor( ( seconds % 3600 ) / 60 ) ) )
					.replace( '%4$s', pad( seconds % 60 ) );
			};
			timer = window.setInterval( tick, 1000 );
			tick();
		}
	}

	/* The footer reveal: only while the footer fits in the window, else it scrolls as usual. */

	const footer = data.reveal && parts.footer ? document.querySelector( parts.footer ) : null;
	if ( footer ) {
		const fit = () => document.body.classList.toggle( 'themor-footer-reveal', footer.offsetHeight < window.innerHeight * 0.9 );
		window.addEventListener( 'resize', fit, { passive: true } );
		if ( 'ResizeObserver' in window ) {
			new window.ResizeObserver( fit ).observe( footer );
		}
		fit();
	}

	/* The sidebar as a drawer, below the tablet width: moved in and out of it as the window changes. */

	const drawer = data.drawer;
	const sidebar = drawer && parts.sidebar ? document.querySelector( parts.sidebar ) : null;
	const before = sidebar && parts.before ? document.querySelector( parts.before ) : null;
	if ( sidebar && before && sidebar.children.length ) {
		const home = document.createComment( 'themor-sidebar' );
		sidebar.before( home );

		const dialog = document.createElement( 'dialog' );
		dialog.className = 'themor-site-drawer';
		dialog.id = 'themor-sidebar-drawer';
		dialog.setAttribute( 'aria-labelledby', 'themor-sidebar-drawer-title' );
		dialog.innerHTML = '<div class="themor-site-drawer__panel"><div class="themor-site-drawer__head"><h2 class="themor-site-drawer__title" id="themor-sidebar-drawer-title"></h2><button type="button" class="themor-site-drawer__close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="themor-site-drawer__body"></div></div>';
		dialog.querySelector( '.themor-site-drawer__title' ).textContent = drawer.label || '';
		dialog.querySelector( '.themor-site-drawer__close' ).setAttribute( 'aria-label', drawer.close || '' );
		document.body.append( dialog );

		const button = document.createElement( 'button' );
		button.type = 'button';
		button.className = 'themor-sidebar-button';
		button.setAttribute( 'aria-haspopup', 'dialog' );
		button.setAttribute( 'aria-controls', dialog.id );
		button.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg><span></span>';
		button.querySelector( 'span' ).textContent = drawer.label || '';
		before.before( button );

		const close = () => dialog.open && dialog.close();
		button.addEventListener( 'click', () => {
			dialog.showModal();
			document.documentElement.classList.add( 'themor-site-locked' );
		} );
		dialog.addEventListener( 'close', () => {
			document.documentElement.classList.remove( 'themor-site-locked' );
			button.focus();
		} );
		dialog.addEventListener( 'click', ( event ) => {
			if ( event.target === dialog || event.target.closest( '.themor-site-drawer__close' ) ) {
				close();
			}
		} );

		const narrow = window.matchMedia( `(max-width: ${ Number( drawer.below ) || 1024 }px)` );
		const place = () => {
			if ( narrow.matches ) {
				dialog.querySelector( '.themor-site-drawer__body' ).append( sidebar );
				button.hidden = false;
			} else {
				close();
				home.after( sidebar );
				button.hidden = true;
			}
		};
		narrow.addEventListener( 'change', place );
		place();
	}
} )();
