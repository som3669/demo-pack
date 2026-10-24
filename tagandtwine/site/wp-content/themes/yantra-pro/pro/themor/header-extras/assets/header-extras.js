/**
 * Themor's header extras: live search results under the search forms a theme names, the log-in
 * window opened by the links it names, and the departments menu. Settings come from
 * `window.themorHeaderExtras`.
 */
( function () {
	const data = window.themorHeaderExtras || {};

	/* Live search. A form's department select (`product_cat`) and `post_type` field narrow it. */
	const search = data.search;
	if ( search && search.selector && search.url ) {
		const i18n = search.i18n || {};
		let count = 0;

		const attach = ( form ) => {
			const field = form.querySelector( 'input[type="search"], input[name="s"]' );
			if ( ! field || form.dataset.themorLive ) {
				return;
			}
			const department = form.querySelector( 'select[name="product_cat"]' );
			const type = form.querySelector( 'input[name="post_type"]' );
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
					if ( type && type.value ) {
						url.searchParams.set( 'post_type', type.value );
					}
					if ( department && department.value ) {
						url.searchParams.set( 'product_cat', department.value );
					}
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
			// Another department searches again, for the words already typed.
			if ( department ) {
				department.addEventListener( 'change', () => {
					window.clearTimeout( timer );
					ask();
				} );
			}
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

	/*
	 * The departments menu, a <details>: its button opens it (and pointing at it, where it is set
	 * to), with the first department's flyout shown. Pointing at a department (after a short wait,
	 * longer while the pointer heads for the flyout shown), focusing it and the arrow keys move
	 * between departments; the inline-end arrow goes into the flyout. Escape closes the flyout,
	 * then the panel; a click outside, or focus moving on, closes it. On touch, the first tap on a
	 * department with a flyout opens the flyout instead of following the link.
	 */
	if ( data.departments ) {
		const doc = document;
		const ROOT = '[data-themor-dept]';
		const ROW = '.themor-hx-dept__list > .themor-hx-dept__item';
		const LINK = '.themor-hx-dept__link';
		const canHover = window.matchMedia( '(hover: hover) and (pointer: fine)' );
		const closing = new WeakMap();
		const tapped = new WeakMap();
		let pointer = 'mouse';
		let pending = 0;
		let previous = null;
		let current = null;
		let quiet = false;

		// The script lays the flyouts out from here on (without it, CSS shows them on hover and focus).
		doc.documentElement.classList.add( 'themor-hx-dept-js' );

		const rowsOf = ( root ) => [ ...root.querySelectorAll( ROW ) ];
		const linkOf = ( row ) => row.querySelector( `:scope > ${ LINK }` );
		const flyoutOf = ( row ) => ( row ? row.querySelector( ':scope > .themor-hx-dept__flyout' ) : null );
		const buttonOf = ( root ) => root.querySelector( ':scope > .themor-hx-dept__button' );
		const activeOf = ( root ) => root.querySelector( `${ ROW }.is-active` );
		const isRtl = ( root ) => 'rtl' === window.getComputedStyle( root ).direction;
		const toEnd = ( root, key ) => key === ( isRtl( root ) ? 'ArrowLeft' : 'ArrowRight' );
		const toStart = ( root, key ) => key === ( isRtl( root ) ? 'ArrowRight' : 'ArrowLeft' );
		const focusables = ( element ) => [ ...element.querySelectorAll( 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])' ) ];
		const focusQuietly = ( element ) => {
			quiet = true;
			element.focus();
			quiet = false;
		};

		/**
		 * Lay an open panel out: just under its button, the list lined up with the button (while
		 * the flyout keeps half the panel's width beside it), no taller than the window has room
		 * for, and as tall as the flyout shown.
		 *
		 * @param {HTMLDetailsElement} root Departments menu.
		 */
		const fit = ( root ) => {
			const panel = root.querySelector( ':scope > .themor-hx-dept__panel' );
			const list = panel ? panel.querySelector( '.themor-hx-dept__list' ) : null;
			if ( ! root.open || ! list ) {
				return;
			}
			const button = buttonOf( root ).getBoundingClientRect();
			const box = panel.offsetParent || doc.body;
			panel.style.setProperty( '--themor-hx-dept-top', `${ Math.round( button.bottom - box.getBoundingClientRect().top - box.clientTop ) }px` );
			const rect = panel.getBoundingClientRect();
			const start = isRtl( root ) ? rect.right - button.right : button.left - rect.left;
			const most = rect.width - list.offsetWidth - rect.width / 2;
			panel.style.setProperty( '--themor-hx-dept-start', `${ Math.round( Math.max( 0, Math.min( start, most ) ) ) }px` );
			const room = Math.max( 240, Math.floor( window.innerHeight - rect.top - 16 ) );
			panel.style.setProperty( '--themor-hx-dept-max', `${ room }px` );
			panel.style.removeProperty( '--themor-hx-dept-height' );
			const flyout = flyoutOf( activeOf( root ) );
			if ( flyout ) {
				panel.style.setProperty( '--themor-hx-dept-height', `${ Math.min( room, Math.ceil( flyout.scrollHeight ) ) }px` );
			}
		};

		/**
		 * Show a department's flyout (none for null).
		 *
		 * @param {HTMLDetailsElement} root Departments menu.
		 * @param {HTMLElement|null}   row  The department's row.
		 */
		const activate = ( root, row ) => {
			window.clearTimeout( pending );
			rowsOf( root ).forEach( ( item ) => {
				item.classList.toggle( 'is-active', item === row );
				const link = linkOf( item );
				if ( link && flyoutOf( item ) ) {
					link.setAttribute( 'aria-expanded', String( item === row ) );
				}
			} );
			fit( root );
		};

		const close = ( root, focus = false ) => {
			window.clearTimeout( closing.get( root ) );
			root.open = false;
			if ( focus ) {
				buttonOf( root ).focus();
			}
		};

		// Opened, the first department with a flyout shows it, and others close; closed, it starts over.
		doc.addEventListener(
			'toggle',
			( event ) => {
				const root = event.target;
				if ( ! ( root instanceof window.HTMLElement ) || ! root.matches( ROOT ) ) {
					return;
				}
				if ( ! root.open ) {
					activate( root, null );
					delete root.dataset.themorDeptBy;
					tapped.delete( root );
					return;
				}
				doc.querySelectorAll( `${ ROOT }[open]` ).forEach( ( other ) => other !== root && close( other ) );
				if ( activeOf( root ) ) {
					fit( root );
				} else {
					activate( root, rowsOf( root ).find( flyoutOf ) || null );
				}
			},
			true
		);

		doc.addEventListener( 'keydown', ( event ) => {
			const root = event.target.closest ? event.target.closest( ROOT ) : null;
			if ( ! root ) {
				// Escape anywhere closes a panel that opened as the pointer came by.
				if ( 'Escape' === event.key ) {
					doc.querySelectorAll( `${ ROOT }[open]` ).forEach( ( open ) => 'hover' === open.dataset.themorDeptBy && close( open ) );
				}
				return;
			}
			const rows = rowsOf( root );
			if ( event.target === buttonOf( root ) ) {
				if ( 'ArrowDown' === event.key && rows.length ) {
					event.preventDefault();
					root.dataset.themorDeptBy = 'key';
					root.open = true;
					linkOf( rows[ 0 ] ).focus();
				} else if ( 'Escape' === event.key && root.open ) {
					event.preventDefault();
					close( root );
				}
				return;
			}
			if ( ! root.open || event.target.matches( 'input, select, textarea' ) ) {
				return;
			}
			if ( 'Escape' === event.key ) {
				event.preventDefault();
				const active = activeOf( root );
				const flyout = flyoutOf( active );
				if ( flyout ) {
					// The flyout first; from inside it, focus goes back to its department.
					activate( root, null );
					if ( flyout.contains( event.target ) ) {
						focusQuietly( linkOf( active ) );
					}
				} else {
					close( root, true );
				}
				return;
			}
			const row = event.target.closest( ROW );
			if ( ! row ) {
				return;
			}
			const link = linkOf( row );
			const flyout = flyoutOf( row );
			if ( event.target === link ) {
				const at = rows.indexOf( row );
				const next = {
					ArrowDown: rows[ ( at + 1 ) % rows.length ],
					ArrowUp: rows[ ( at - 1 + rows.length ) % rows.length ],
					Home: rows[ 0 ],
					End: rows[ rows.length - 1 ],
				}[ event.key ];
				if ( next ) {
					event.preventDefault();
					linkOf( next ).focus();
				} else if ( flyout && toEnd( root, event.key ) ) {
					event.preventDefault();
					activate( root, row );
					const first = focusables( flyout )[ 0 ];
					if ( first ) {
						first.focus();
					}
				}
				return;
			}
			if ( flyout && flyout.contains( event.target ) ) {
				const links = focusables( flyout );
				const at = links.indexOf( event.target );
				if ( 'ArrowDown' === event.key || 'ArrowUp' === event.key ) {
					event.preventDefault();
					const next = links[ at + ( 'ArrowDown' === event.key ? 1 : -1 ) ];
					( next || ( 'ArrowUp' === event.key ? link : event.target ) ).focus();
				} else if ( toStart( root, event.key ) ) {
					event.preventDefault();
					link.focus();
				}
			}
		} );

		// Focus on a department shows its flyout; focus leaving the menu closes it.
		doc.addEventListener( 'focusin', ( event ) => {
			const root = event.target.closest ? event.target.closest( ROOT ) : null;
			const link = root && root.open && ! quiet ? event.target.closest( LINK ) : null;
			if ( link && link.parentElement.matches( ROW ) && ! link.parentElement.classList.contains( 'is-active' ) ) {
				activate( root, link.parentElement );
			}
		} );
		doc.addEventListener( 'focusout', ( event ) => {
			const root = event.target.closest ? event.target.closest( ROOT ) : null;
			if ( root && root.open && event.relatedTarget && ! root.contains( event.relatedTarget ) ) {
				close( root );
			}
		} );

		// Pointing: where the pointer is heading, opening on hover, and moving between departments.
		doc.addEventListener(
			'pointerdown',
			( event ) => {
				pointer = event.pointerType || 'mouse';
			},
			true
		);
		doc.addEventListener(
			'pointermove',
			( event ) => {
				if ( 'mouse' === event.pointerType ) {
					previous = current;
					current = event.clientX;
				}
			},
			{ passive: true }
		);
		doc.addEventListener( 'pointerover', ( event ) => {
			const root = 'mouse' === event.pointerType && event.target.closest ? event.target.closest( ROOT ) : null;
			if ( ! root ) {
				return;
			}
			pointer = 'mouse';
			window.clearTimeout( closing.get( root ) );
			if ( ! root.open ) {
				if ( 'hover' === root.dataset.themorDeptOpen && canHover.matches && event.target.closest( '.themor-hx-dept__button' ) ) {
					root.dataset.themorDeptBy = 'hover';
					root.open = true;
				}
				return;
			}
			const row = event.target.closest( ROW );
			window.clearTimeout( pending );
			if ( ! row || row.classList.contains( 'is-active' ) ) {
				return;
			}
			// Heading for the flyout shown, the rows on the way wait longer before taking over.
			const heading = flyoutOf( activeOf( root ) ) && null !== previous && ( isRtl( root ) ? current < previous : current > previous );
			pending = window.setTimeout( () => {
				if ( row.matches( ':hover' ) ) {
					activate( root, row );
				}
			}, heading ? 320 : 90 );
		} );
		doc.addEventListener( 'pointerout', ( event ) => {
			const root = 'mouse' === event.pointerType && event.target.closest ? event.target.closest( ROOT ) : null;
			if ( ! root || ( event.relatedTarget && root.contains( event.relatedTarget ) ) ) {
				return;
			}
			window.clearTimeout( pending );
			if ( root.open && 'hover' === root.dataset.themorDeptBy && ! root.contains( doc.activeElement ) ) {
				closing.set(
					root,
					window.setTimeout( () => close( root ), 350 )
				);
			}
		} );

		doc.addEventListener( 'click', ( event ) => {
			doc.querySelectorAll( `${ ROOT }[open]` ).forEach( ( open ) => ! open.contains( event.target ) && close( open ) );
			const root = event.target.closest ? event.target.closest( ROOT ) : null;
			if ( ! root ) {
				return;
			}
			if ( event.target.closest( '.themor-hx-dept__button' ) ) {
				// Opened as the pointer came by, a click keeps it open rather than closing it.
				if ( root.open && 'hover' === root.dataset.themorDeptBy ) {
					event.preventDefault();
				}
				root.dataset.themorDeptBy = 'click';
				return;
			}
			const link = event.target.closest( LINK );
			const row = link ? link.parentElement : null;
			if ( ! row || ! row.matches( ROW ) || ! flyoutOf( row ) ) {
				return;
			}
			if ( 'BUTTON' === link.tagName ) {
				activate( root, row );
				return;
			}
			// A tap (not the keyboard's Enter): the first opens the flyout, the next follows the link.
			const type = event.pointerType || ( event.detail ? pointer : '' );
			if ( ( 'touch' === type || 'pen' === type ) && tapped.get( root ) !== row ) {
				event.preventDefault();
				tapped.set( root, row );
				activate( root, row );
			}
		} );

		let frame = 0;
		const refit = () => {
			if ( ! frame ) {
				frame = window.requestAnimationFrame( () => {
					frame = 0;
					doc.querySelectorAll( `${ ROOT }[open]` ).forEach( fit );
				} );
			}
		};
		window.addEventListener( 'resize', refit, { passive: true } );
		window.addEventListener( 'scroll', refit, { passive: true } );
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
