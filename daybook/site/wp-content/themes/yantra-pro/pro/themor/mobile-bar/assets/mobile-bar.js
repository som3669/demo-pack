/**
 * Themor's mobile bar: the search sheet, the Menu item (pressing the theme's menu button), and
 * hiding while scrolling down. Settings come from `window.themorMobileBar`.
 */
( function () {
	const data = window.themorMobileBar || {};
	const bar = document.querySelector( '.themor-mbar' );
	if ( ! bar ) {
		return;
	}

	// The Menu item presses the theme's menu button; without one it goes.
	const menuItem = bar.querySelector( '[data-themor-mbar-menu]' );
	if ( menuItem && ( ! data.menu || ! document.querySelector( data.menu ) ) ) {
		menuItem.closest( 'li' ).remove();
	}

	document.addEventListener( 'click', ( event ) => {
		const target = event.target;
		if ( ! target.closest ) {
			return;
		}
		if ( target.closest( '[data-themor-mbar-menu]' ) ) {
			const button = data.menu ? document.querySelector( data.menu ) : null;
			if ( button ) {
				button.click();
			}
			return;
		}
		const opener = target.closest( '[data-themor-mbar-open]' );
		if ( opener ) {
			const sheet = document.getElementById( opener.getAttribute( 'data-themor-mbar-open' ) );
			if ( sheet && ! sheet.open ) {
				sheet.showModal();
				const field = sheet.querySelector( 'input[type="search"], input[name="s"]' );
				if ( field ) {
					field.focus();
				}
				sheet.addEventListener( 'close', () => opener.focus(), { once: true } );
			}
			return;
		}
		const sheet = target.closest( 'dialog.themor-mbar-sheet' );
		if ( sheet && ( target === sheet || target.closest( '[data-themor-mbar-close]' ) ) ) {
			sheet.close();
		}
	} );

	// Hide while scrolling down, back when scrolling up or near the top.
	if ( data.hideOnScroll ) {
		let last = window.scrollY;
		let ticking = false;
		window.addEventListener(
			'scroll',
			() => {
				if ( ticking ) {
					return;
				}
				ticking = true;
				window.requestAnimationFrame( () => {
					const now = window.scrollY;
					if ( Math.abs( now - last ) > 6 ) {
						bar.classList.toggle( 'is-hidden', now > last && now > 120 );
						last = now;
					}
					ticking = false;
				} );
			},
			{ passive: true }
		);
	}
} )();
