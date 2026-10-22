/**
 * Content Blocks' popups (includes/Popups.php). Each is a <dialog> with its settings in
 * data-themor-popup. This opens it when its trigger says (on load, after some seconds, on
 * scroll, when an element shows, on a click, after inactivity, on exit intent, after some
 * pages), on a link to #themor-popup-ID or from the address, keeps in the browser when it was
 * closed (so it opens again as set), and closes it with its button, Escape, a click outside or
 * an action inside (a form sent, a button). With a backdrop it is modal: the page waits, focus
 * moves in and comes back.
 */
( function () {
	const config = window.themorPopups || {};
	const KEY = 'themor-popups';
	const popups = Array.prototype.slice.call( document.querySelectorAll( 'dialog.themor-popup[data-themor-popup]' ) );
	if ( ! popups.length || 'function' !== typeof HTMLDialogElement ) {
		return;
	}
	const still = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	const settings = new Map();
	popups.forEach( ( popup ) => {
		try {
			settings.set( popup, JSON.parse( popup.dataset.themorPopup ) );
		} catch ( error ) {}
	} );

	// What the browser keeps: popup ID => { seen (time it last opened), closed (time), reason, pages }.
	const read = () => {
		try {
			return JSON.parse( window.localStorage.getItem( KEY ) || '{}' ) || {};
		} catch ( error ) {
			return {};
		}
	};
	const keep = ( id, patch ) => {
		try {
			const all = read();
			all[ id ] = Object.assign( {}, all[ id ] || {}, patch );
			window.localStorage.setItem( KEY, JSON.stringify( all ) );
		} catch ( error ) {}
	};

	const device = () => {
		const width = window.innerWidth;
		return width > ( config.tablet || 1024 ) ? 'desktop' : width > ( config.mobile || 767 ) ? 'tablet' : 'mobile';
	};
	const onDevice = ( popup ) => ( settings.get( popup )?.devices || [] ).includes( device() );

	// Whether a popup may open by itself: on this device, and not seen lately (as set): never
	// again once seen, every time, or some days after it was last seen or closed (others after
	// the action inside was done).
	const may = ( popup ) => {
		const set = settings.get( popup );
		if ( ! set || ! onDevice( popup ) ) {
			return false;
		}
		const kept = read()[ set.id ];
		if ( ! kept || ( ! kept.seen && ! kept.closed ) || 'always' === set.again ) {
			return true;
		}
		if ( 'never' === set.again ) {
			return false;
		}
		const last = Math.max( kept.seen || 0, kept.closed || 0 );
		const days = 'action' === kept.reason ? set.done : set.days;
		return Date.now() - last > days * 864e5;
	};

	const focused = new Map();
	const locks = new Set();

	const lock = ( popup, on ) => {
		const html = document.documentElement;
		if ( on ) {
			if ( ! locks.size ) {
				html.style.setProperty( '--themor-scrollbar', window.innerWidth - html.clientWidth + 'px' );
				html.classList.add( 'themor-popup-locked' );
			}
			locks.add( popup );
		} else {
			locks.delete( popup );
			if ( ! locks.size ) {
				html.classList.remove( 'themor-popup-locked' );
				html.style.removeProperty( '--themor-scrollbar' );
			}
		}
	};

	// Its name: the first heading inside, or its title.
	const name = ( popup ) => {
		const heading = popup.querySelector( '.themor-popup__content :is(h1, h2, h3, h4, h5, h6)' );
		if ( heading ) {
			heading.id = heading.id || popup.id + '-title';
			popup.setAttribute( 'aria-labelledby', heading.id );
		}
	};

	// A popup that loads its content when it opens gets it once.
	const load = ( popup ) => {
		const set = settings.get( popup );
		const content = popup.querySelector( '.themor-popup__content' );
		if ( ! set.lazy || ! content || popup.dataset.loaded ) {
			return Promise.resolve();
		}
		popup.dataset.loaded = '1';
		return window
			.fetch( set.lazy, { credentials: 'same-origin' } )
			.then( ( response ) => ( response.ok ? response.json() : { html: '' } ) )
			.then( ( data ) => {
				content.innerHTML = data && data.html ? data.html : '';
			} )
			.catch( () => {
				delete popup.dataset.loaded;
			} )
			.then( () => {
				content.removeAttribute( 'aria-busy' );
				name( popup );
			} );
	};

	const open = ( popup, auto ) => {
		const set = settings.get( popup );
		// Never on a device it is hidden on: a modal no one sees would hold the page.
		if ( ! set || popup.open || ! onDevice( popup ) ) {
			return;
		}
		const before = document.activeElement;
		focused.set( popup, before );
		name( popup );
		load( popup );
		if ( set.modal ) {
			popup.showModal();
		} else {
			popup.show();
			// Opened by itself, it doesn't take the focus from the page.
			if ( auto ) {
				if ( before && before !== document.body && 'function' === typeof before.focus ) {
					before.focus( { preventScroll: true } );
				} else if ( document.activeElement && popup.contains( document.activeElement ) ) {
					document.activeElement.blur();
				}
			}
		}
		if ( set.lock ) {
			lock( popup, true );
		}
		window.requestAnimationFrame( () => window.requestAnimationFrame( () => popup.classList.add( 'is-open' ) ) );
		keep( set.id, { seen: Date.now() } );
		popup.dispatchEvent( new CustomEvent( 'themor:popup-open', { bubbles: true } ) );
	};

	// Media inside stop when it closes.
	const quiet = ( popup ) => {
		popup.querySelectorAll( 'video, audio' ).forEach( ( media ) => media.pause() );
		popup.querySelectorAll( 'iframe' ).forEach( ( frame ) => {
			if ( /youtube|vimeo|youtu\.be|dailymotion|spotify|soundcloud/i.test( frame.src ) ) {
				frame.src = frame.src; // eslint-disable-line no-self-assign
			}
		} );
	};

	const close = ( popup, reason ) => {
		const set = settings.get( popup );
		if ( ! set || ! popup.open || popup.classList.contains( 'is-closing' ) ) {
			return;
		}
		// Closed by scrolling back, it may open again on this page; any other way is kept.
		if ( 'scroll' !== reason ) {
			const kept = { closed: Date.now(), reason: reason || 'close' };
			if ( 'pages' === set.trigger ) {
				kept.pages = [ location.pathname + location.search ];
			}
			keep( set.id, kept );
		}
		popup.classList.add( 'is-closing' );
		popup.classList.remove( 'is-open' );
		const done = () => {
			popup.classList.remove( 'is-closing' );
			popup.close();
			quiet( popup );
			lock( popup, false );
			const before = focused.get( popup );
			if ( set.modal && before && document.contains( before ) && 'function' === typeof before.focus ) {
				before.focus( { preventScroll: true } );
			}
			popup.dispatchEvent( new CustomEvent( 'themor:popup-close', { bubbles: true, detail: { reason: reason || 'close' } } ) );
		};
		const wait = still ? 0 : set.speed * 1000;
		if ( wait > 0 ) {
			window.setTimeout( done, wait );
		} else {
			done();
		}
	};

	const later = ( seconds, then ) => ( seconds > 0 ? window.setTimeout( then, seconds * 1000 ) : then() );

	// Closing.
	popups.forEach( ( popup ) => {
		const set = settings.get( popup );
		if ( ! set ) {
			return;
		}
		popup.addEventListener( 'click', ( event ) => {
			if ( event.target.closest( '[data-themor-popup-close]' ) && popup.contains( event.target.closest( '[data-themor-popup-close]' ) ) ) {
				event.preventDefault();
				close( popup, 'close' );
				return;
			}
			// A click on the backdrop lands on the dialog itself, outside its box.
			if ( event.target === popup && set.outside ) {
				const box = popup.getBoundingClientRect();
				const out = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
				if ( out ) {
					close( popup, 'close' );
				}
			}
			if ( 'button' === set.action && set.button ) {
				let match = null;
				try {
					match = event.target.closest( set.button );
				} catch ( error ) {}
				if ( match && popup.contains( match ) ) {
					const link = match.closest( 'a[href]' );
					const goes = link && ! /^(#|javascript:)/i.test( link.getAttribute( 'href' ) || '#' );
					if ( ! goes ) {
						event.preventDefault();
					}
					later( set.delay, () => close( popup, 'action' ) );
				}
			}
		} );
		// Escape, for a modal: the browser asks to cancel.
		popup.addEventListener( 'cancel', ( event ) => {
			event.preventDefault();
			if ( set.esc ) {
				close( popup, 'close' );
			}
		} );
		if ( 'form' === set.action ) {
			const sent = () => later( set.delay, () => close( popup, 'action' ) );
			// Forms sent in the page by their plugin.
			popup.addEventListener( 'wpcf7mailsent', sent );
			document.addEventListener( 'kb-form-success', ( event ) => popup.contains( event.target ) && sent() );
			if ( window.jQuery ) {
				const $ = window.jQuery;
				$( popup ).on( 'wpformsAjaxSubmitSuccess fluentform_submission_success', sent );
				$( document ).on( 'gform_confirmation_loaded', ( event, formId ) => popup.querySelector( '#gform_wrapper_' + formId + ', #gform_confirmation_wrapper_' + formId ) && sent() );
				$( document ).on( 'nfFormSubmitResponse', ( event, response ) => {
					const form = response && response.id ? popup.querySelector( '#nf-form-' + response.id + '-cont' ) : null;
					if ( form && ! ( response.response && response.response.errors && Object.keys( response.response.errors ).length ) ) {
						sent();
					}
				} );
			}
			// Any other form: sent the page's way, it counts as done, and goes on its way.
			popup.addEventListener( 'submit', ( event ) => {
				const form = event.target;
				if ( form.matches( '.wpcf7-form, .wpforms-form, .frm-fluent-form, [id^="gform_"], .kb-form' ) || form.closest( '.nf-form-cont' ) ) {
					return;
				}
				keep( set.id, { closed: Date.now(), reason: 'action' } );
			} );
		}
	} );

	// Escape closes the last popup opened that isn't modal (a modal one gets `cancel`).
	document.addEventListener( 'keydown', ( event ) => {
		if ( 'Escape' !== event.key ) {
			return;
		}
		const shown = popups.filter( ( popup ) => popup.open && ! settings.get( popup ).modal && settings.get( popup ).esc );
		if ( shown.length ) {
			close( shown[ shown.length - 1 ], 'close' );
		}
	} );

	// Links: #themor-popup-ID (or this page's address with it), and [data-themor-popup-open].
	const target = ( element ) => {
		const opener = element.closest( '[data-themor-popup-open], a[href*="#themor-popup-"]' );
		if ( ! opener ) {
			return null;
		}
		let id = opener.getAttribute( 'data-themor-popup-open' );
		if ( ! id ) {
			const href = opener.getAttribute( 'href' ) || '';
			try {
				const address = new URL( href, location.href );
				if ( address.origin + address.pathname !== location.origin + location.pathname ) {
					return null;
				}
				id = ( address.hash.match( /^#themor-popup-(\d+)$/ ) || [] )[ 1 ];
			} catch ( error ) {
				return null;
			}
		}
		const popup = id ? document.getElementById( 'themor-popup-' + id ) : null;
		return popup && settings.has( popup ) ? popup : null;
	};
	document.addEventListener( 'click', ( event ) => {
		const popup = target( event.target );
		if ( popup ) {
			event.preventDefault();
			if ( popup.open ) {
				close( popup, 'close' );
			} else {
				open( popup, false );
			}
		}
	} );
	const fromAddress = ( location.hash.match( /^#themor-popup-(\d+)$/ ) || [] )[ 1 ];
	if ( fromAddress ) {
		const popup = document.getElementById( 'themor-popup-' + fromAddress );
		if ( popup && settings.has( popup ) ) {
			open( popup, false );
		}
	}

	// Triggers.
	const distance = ( set ) => {
		const size = Number( set.scroll && set.scroll.size ) || 0;
		const unit = set.scroll && set.scroll.unit;
		if ( '%' === unit ) {
			return ( Math.max( document.documentElement.scrollHeight - window.innerHeight, 0 ) * size ) / 100;
		}
		return 'vh' === unit ? ( window.innerHeight * size ) / 100 : size;
	};
	popups.forEach( ( popup ) => {
		const set = settings.get( popup );
		if ( ! set ) {
			return;
		}
		switch ( set.trigger ) {
			case 'load':
				if ( may( popup ) ) {
					open( popup, true );
				}
				break;
			case 'time':
				if ( may( popup ) ) {
					window.setTimeout( () => may( popup ) && open( popup, true ), set.seconds * 1000 );
				}
				break;
			case 'scroll': {
				if ( ! may( popup ) ) {
					break;
				}
				let deepest = window.scrollY;
				let byScroll = false;
				const check = () => {
					const now = window.scrollY;
					deepest = Math.max( deepest, now );
					const far = distance( set );
					const reached = set.up ? deepest - now > far : now >= far;
					if ( reached && ! popup.open && ( byScroll || may( popup ) ) ) {
						byScroll = true;
						open( popup, true );
						if ( ! set.back ) {
							window.removeEventListener( 'scroll', check );
						}
					} else if ( ! reached && popup.open && set.back && byScroll ) {
						close( popup, 'scroll' );
					}
				};
				window.addEventListener( 'scroll', check, { passive: true } );
				// Closed another way, it stays closed on this page.
				popup.addEventListener( 'themor:popup-close', ( event ) => {
					if ( 'scroll' !== event.detail.reason ) {
						window.removeEventListener( 'scroll', check );
					}
				} );
				check();
				break;
			}
			case 'element': {
				if ( ! may( popup ) || ! ( 'IntersectionObserver' in window ) ) {
					break;
				}
				let elements = [];
				try {
					elements = Array.prototype.slice.call( document.querySelectorAll( set.selector ) );
				} catch ( error ) {}
				if ( elements.length ) {
					const seen = new IntersectionObserver( ( entries ) => {
						if ( entries.some( ( entry ) => entry.isIntersecting ) ) {
							seen.disconnect();
							open( popup, true );
						}
					} );
					elements.forEach( ( element ) => seen.observe( element ) );
				}
				break;
			}
			case 'click':
				// Every click on such an element opens it, whenever it was closed.
				document.addEventListener( 'click', ( event ) => {
					let match = null;
					try {
						match = set.selector ? event.target.closest( set.selector ) : null;
					} catch ( error ) {}
					if ( match && ! popup.contains( match ) ) {
						event.preventDefault();
						open( popup, false );
					}
				} );
				break;
			case 'inactivity': {
				if ( ! may( popup ) ) {
					break;
				}
				let timer = 0;
				const events = [ 'mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel' ];
				const stop = () => {
					window.clearTimeout( timer );
					events.forEach( ( type ) => window.removeEventListener( type, wait, true ) );
				};
				const wait = () => {
					window.clearTimeout( timer );
					timer = window.setTimeout( () => {
						stop();
						if ( may( popup ) ) {
							open( popup, true );
						}
					}, set.seconds * 1000 );
				};
				events.forEach( ( type ) => window.addEventListener( type, wait, { capture: true, passive: true } ) );
				wait();
				break;
			}
			case 'exit': {
				// The pointer leaving the page by its top, toward the tabs or the address bar.
				if ( ! may( popup ) || ! ( window.matchMedia && window.matchMedia( '(pointer: fine)' ).matches ) ) {
					break;
				}
				const leave = ( event ) => {
					if ( ! event.relatedTarget && event.clientY <= 0 ) {
						document.removeEventListener( 'mouseout', leave );
						if ( may( popup ) ) {
							open( popup, true );
						}
					}
				};
				document.addEventListener( 'mouseout', leave );
				break;
			}
			case 'pages': {
				// The pages seen since it was last closed, this one among them.
				const kept = read()[ set.id ] || {};
				const pages = Array.isArray( kept.pages ) ? kept.pages : [];
				const here = location.pathname + location.search;
				if ( ! pages.includes( here ) ) {
					pages.push( here );
				}
				keep( set.id, { pages: pages.slice( -100 ) } );
				if ( pages.length > set.pages && may( popup ) ) {
					open( popup, true );
				}
				break;
			}
		}
	} );

	window.themorPopups = Object.assign( config, {
		open: ( id ) => {
			const popup = document.getElementById( 'themor-popup-' + id );
			if ( popup && settings.has( popup ) ) {
				open( popup, false );
			}
		},
		close: ( id ) => {
			const popup = document.getElementById( 'themor-popup-' + id );
			if ( popup && settings.has( popup ) ) {
				close( popup, 'close' );
			}
		},
	} );
} )();
