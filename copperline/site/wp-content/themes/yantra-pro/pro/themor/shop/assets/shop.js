/**
 * Themor's shop module: the cart drawer, adding to the cart without leaving the page, quick
 * view, the grid and list views, the filters drawer, "Load more" and infinite scroll, the
 * sticky Add to cart bar, and recently viewed products. Settings come from `window.themorShop` (Shop::enqueue()).
 * WooCommerce's own events (jQuery's) say when its Add to cart buttons have added a product.
 */
( function () {
	const data = window.themorShop || {};
	const i18n = data.i18n || {};
	const $ = window.jQuery;
	const root = document.documentElement;

	const endpoint = ( name ) => String( data.ajax || '' ).replace( '%%endpoint%%', name );

	/* Drawers and windows. */

	const open = ( dialog ) => {
		if ( ! dialog || dialog.open ) {
			return;
		}
		dialog.showModal();
		root.classList.add( 'themor-shop-locked' );
		// A player waiting in `data-src` (a product's video) loads as its window opens.
		dialog.querySelectorAll( '[data-src]' ).forEach( ( player ) => {
			player.src = player.getAttribute( 'data-src' );
			if ( 'VIDEO' === player.tagName ) {
				player.play().catch( () => {} );
			}
		} );
	};

	const close = ( dialog ) => {
		if ( dialog && dialog.open ) {
			dialog.close();
		}
	};

	document.querySelectorAll( '.themor-shop-dialog' ).forEach( ( dialog ) => {
		dialog.addEventListener( 'close', () => {
			// And stops as it closes.
			dialog.querySelectorAll( '[data-src]' ).forEach( ( player ) => {
				if ( 'VIDEO' === player.tagName ) {
					player.pause();
				}
				player.removeAttribute( 'src' );
			} );
			if ( ! document.querySelector( '.themor-shop-dialog[open]' ) ) {
				root.classList.remove( 'themor-shop-locked' );
			}
		} );
	} );

	const drawer = document.getElementById( 'themor-cart-drawer' );

	document.addEventListener( 'click', ( event ) => {
		const target = event.target;

		// The close button, or a click outside the panel (on the dialog itself: its backdrop).
		if ( target.closest( '[data-themor-close]' ) ) {
			close( target.closest( 'dialog' ) );
			return;
		}
		if ( target.classList && target.classList.contains( 'themor-shop-dialog' ) ) {
			close( target );
			return;
		}

		const opener = target.closest( '[data-themor-open]' );
		if ( opener ) {
			open( document.getElementById( opener.getAttribute( 'data-themor-open' ) ) );
			return;
		}

		// The header's cart opens the drawer.
		if ( data.drawer && drawer && data.cartSelector && target.closest( data.cartSelector ) ) {
			event.preventDefault();
			open( drawer );
			return;
		}

		const upsell = target.closest( '[data-themor-upsell]' );
		if ( upsell ) {
			addUpsell( upsell );
			return;
		}

		const quick = target.closest( '[data-themor-quick-view]' );
		if ( quick ) {
			event.preventDefault();
			quickView( quick.getAttribute( 'data-themor-quick-view' ), quick );
			return;
		}

		const view = target.closest( '[data-themor-view]' );
		if ( view ) {
			setView( view.getAttribute( 'data-themor-view' ), true );
			return;
		}

		const sticky = target.closest( '[data-themor-sticky]' );
		if ( sticky ) {
			stickyAction( sticky );
		}
	} );

	/* The cart: fragments, and adding without leaving the page. */

	const applyFragments = ( fragments ) => {
		Object.keys( fragments || {} ).forEach( ( selector ) => {
			document.querySelectorAll( selector ).forEach( ( element ) => {
				element.outerHTML = fragments[ selector ];
			} );
		} );
	};

	const afterAdd = () => {
		if ( data.openOnAdd && data.drawer && drawer ) {
			close( document.getElementById( 'themor-quick-view' ) );
			open( drawer );
		}
	};

	// WooCommerce's own Add to cart buttons (the shop's).
	if ( $ ) {
		$( document.body ).on( 'added_to_cart', afterAdd );
	}

	document.addEventListener( 'submit', async ( event ) => {
		const form = event.target.closest && event.target.closest( 'form.cart' );
		if ( ! data.ajaxAdd || ! form || form.classList.contains( 'grouped_form' ) || form.closest( '.product-type-external' ) ) {
			return;
		}
		// Buy now posts the form, so WooCommerce adds the product and goes to checkout.
		if ( event.submitter && event.submitter.hasAttribute( 'data-themor-buy-now' ) ) {
			return;
		}
		const button = event.submitter || form.querySelector( '.single_add_to_cart_button' );
		const body = new FormData( form );
		if ( button && button.name && button.value ) {
			body.set( button.name, button.value );
		}
		if ( ! body.get( 'add-to-cart' ) && ! body.get( 'product_id' ) ) {
			return;
		}
		event.preventDefault();
		if ( button ) {
			button.classList.add( 'loading' );
			button.setAttribute( 'aria-busy', 'true' );
		}
		form.querySelectorAll( '.themor-shop-notice' ).forEach( ( notice ) => notice.remove() );
		try {
			const response = await fetch( endpoint( 'themor_add_to_cart' ), { method: 'POST', body, credentials: 'same-origin' } );
			const result = await response.json();
			if ( result.error ) {
				form.insertAdjacentHTML( 'afterbegin', `<div class="themor-shop-notice">${ result.notices || i18n.error }</div>` );
				return;
			}
			applyFragments( result.fragments );
			if ( $ ) {
				$( document.body ).trigger( 'added_to_cart', [ result.fragments, result.cart_hash, button ? $( button ) : null ] );
			} else {
				afterAdd();
			}
		} catch ( error ) {
			form.submit();
		} finally {
			if ( button ) {
				button.classList.remove( 'loading' );
				button.removeAttribute( 'aria-busy' );
			}
		}
	} );

	// A product to add, from the cart drawer: one click adds one, and the cart's fragments redraw
	// the drawer (the list leaves out what is now in the cart).
	async function addUpsell( button ) {
		if ( button.getAttribute( 'aria-busy' ) ) {
			return;
		}
		const body = new FormData();
		body.set( 'product_id', button.getAttribute( 'data-themor-upsell' ) );
		body.set( 'quantity', '1' );
		button.classList.add( 'loading' );
		button.setAttribute( 'aria-busy', 'true' );
		try {
			const response = await fetch( endpoint( 'themor_add_to_cart' ), { method: 'POST', body, credentials: 'same-origin' } );
			const result = await response.json();
			if ( result.error ) {
				throw new Error( 'not added' );
			}
			applyFragments( result.fragments );
			if ( $ ) {
				$( document.body ).trigger( 'added_to_cart', [ result.fragments, result.cart_hash, null ] );
			}
		} catch ( error ) {
			button.classList.remove( 'loading' );
			button.removeAttribute( 'aria-busy' );
			button.textContent = i18n.error || '';
		}
	}

	/* Quick view. */

	const quickWindow = document.getElementById( 'themor-quick-view' );

	async function quickView( id, button ) {
		if ( ! quickWindow ) {
			return;
		}
		const body = quickWindow.querySelector( '.themor-quick-view' );
		body.className = 'themor-quick-view themor-quick-view--loading';
		body.textContent = i18n.loading || '';
		open( quickWindow );
		try {
			const response = await fetch( `${ endpoint( 'themor_quick_view' ) }&product_id=${ encodeURIComponent( id ) }`, { credentials: 'same-origin' } );
			const result = await response.json();
			if ( ! result.success ) {
				throw new Error( 'unavailable' );
			}
			body.className = 'themor-quick-view';
			body.innerHTML = result.data.html;
			enhance( body );
			const form = body.querySelector( '.variations_form' );
			if ( form && $ && $.fn.wc_variation_form ) {
				$( form ).wc_variation_form();
			}
			const title = body.querySelector( '.themor-quick-view__title' );
			if ( title ) {
				quickWindow.querySelector( '.themor-shop-dialog__title' ).textContent = title.textContent;
			}
		} catch ( error ) {
			body.className = 'themor-quick-view themor-quick-view--loading';
			body.textContent = i18n.error || '';
		}
		quickWindow.addEventListener( 'close', () => button && button.focus(), { once: true } );
	}

	/* Grid and list views. */

	const VIEW_KEY = 'themor-shop-view';

	function setView( view, remember ) {
		const list = 'list' === view;
		document.querySelectorAll( 'ul.products' ).forEach( ( products ) => products.classList.toggle( 'themor-products--list', list ) );
		document.querySelectorAll( '[data-themor-view]' ).forEach( ( button ) => {
			button.setAttribute( 'aria-pressed', String( button.getAttribute( 'data-themor-view' ) === view ) );
		} );
		if ( remember ) {
			try {
				localStorage.setItem( VIEW_KEY, view );
			} catch ( error ) {}
		}
	}

	if ( document.querySelector( '[data-themor-view]' ) ) {
		let saved = '';
		try {
			saved = localStorage.getItem( VIEW_KEY ) || '';
		} catch ( error ) {}
		if ( ( 'grid' === saved || 'list' === saved ) && saved !== data.defaultView ) {
			setView( saved, false );
		}
	}

	/* "Load more" and infinite scroll. */

	// Set up on the page's list, and again on each list filtering without reloading brings.
	function initPager() {
		const pager = document.querySelector( '.woocommerce-pagination' );
		const products = document.querySelector( 'ul.products:not(.themor-viewed__list):not(.themor-wishlist__list)' );
		let next = pager && pager.querySelector( 'a.next' ) ? pager.querySelector( 'a.next' ).href : '';

		if ( pager && products && next && ( 'load-more' === data.pagination || 'infinite' === data.pagination ) ) {
			const wrap = document.createElement( 'div' );
			wrap.className = 'themor-shop-more';
			wrap.innerHTML = `<button type="button" class="button">${ i18n.loadMore || '' }</button>`;
			const button = wrap.firstElementChild;
			pager.hidden = true;
			pager.after( wrap );

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
					page.querySelectorAll( 'ul.products > li' ).forEach( ( item ) => products.append( document.importNode( item, true ) ) );
					const link = page.querySelector( '.woocommerce-pagination a.next' );
					next = link ? link.href : '';
					if ( $ ) {
						$( document.body ).trigger( 'post-load' );
					}
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
	}
	initPager();

	/* The sticky Add to cart bar. */

	const stickyBar = document.querySelector( '.themor-sticky-cart' );
	const mainForm = document.querySelector( '.product form.cart' );

	function stickyAction( button ) {
		if ( ! mainForm ) {
			return;
		}
		if ( 'add' === button.getAttribute( 'data-themor-sticky' ) && mainForm.requestSubmit ) {
			mainForm.requestSubmit( mainForm.querySelector( '.single_add_to_cart_button' ) || undefined );
			return;
		}
		mainForm.scrollIntoView( { behavior: 'smooth', block: 'center' } );
	}

	if ( stickyBar && mainForm && 'IntersectionObserver' in window ) {
		new IntersectionObserver( ( [ entry ] ) => {
			const shown = ! entry.isIntersecting && entry.boundingClientRect.top < 0;
			stickyBar.classList.toggle( 'is-shown', shown );
			stickyBar.toggleAttribute( 'inert', ! shown );
			stickyBar.setAttribute( 'aria-hidden', String( ! shown ) );
		} ).observe( mainForm );
	}

	/* Recently viewed: the products kept in this browser, newest first, shown from the Store API. */

	const VIEWED_KEY = 'themor-shop-viewed';
	const current = Number( data.productId ) || 0;
	let viewed = [];
	try {
		viewed = JSON.parse( localStorage.getItem( VIEWED_KEY ) || '[]' ).filter( Number.isInteger );
	} catch ( error ) {}

	const decode = ( html ) => new DOMParser().parseFromString( html, 'text/html' ).documentElement.textContent;

	const viewedCard = ( item ) => {
		const card = document.createElement( 'li' );
		card.className = 'product themor-viewed__item';
		const link = document.createElement( 'a' );
		link.className = 'woocommerce-LoopProduct-link woocommerce-loop-product__link';
		link.href = item.permalink;
		// Its first image, else WooCommerce's placeholder, as in the shop.
		const image = ( item.images && item.images[ 0 ] ) || { src: data.placeholder, alt: '' };
		if ( image.src ) {
			const img = document.createElement( 'img' );
			img.src = image.thumbnail || image.src;
			img.alt = image.alt || '';
			img.loading = 'lazy';
			img.className = 'themor-viewed__image';
			link.append( img );
		}
		const title = document.createElement( 'h2' );
		title.className = 'woocommerce-loop-product__title';
		title.textContent = decode( item.name || '' );
		link.append( title );
		if ( item.price_html ) {
			const price = document.createElement( 'span' );
			price.className = 'price';
			price.innerHTML = item.price_html;
			link.append( price );
		}
		card.append( link );
		return card;
	};

	const viewedSection = document.querySelector( '[data-themor-viewed]' );
	if ( viewedSection && data.storeApi ) {
		const count = Number( viewedSection.getAttribute( 'data-themor-viewed' ) ) || 4;
		const ids = viewed.filter( ( id ) => id !== current ).slice( 0, count );
		if ( ids.length ) {
			( async () => {
				try {
					const url = new URL( data.storeApi, window.location.href );
					url.searchParams.set( 'include', ids.join( ',' ) );
					url.searchParams.set( 'per_page', String( ids.length ) );
					const response = await fetch( url, { credentials: 'same-origin' } );
					if ( ! response.ok ) {
						return;
					}
					const items = new Map( ( await response.json() ).map( ( item ) => [ item.id, item ] ) );
					const list = viewedSection.querySelector( 'ul' );
					ids.forEach( ( id ) => items.has( id ) && list.append( viewedCard( items.get( id ) ) ) );
					viewedSection.hidden = ! list.children.length;
				} catch ( error ) {}
			} )();
		}
	}

	if ( data.viewed && current ) {
		viewed = [ current, ...viewed.filter( ( id ) => id !== current ) ].slice( 0, 20 );
		try {
			localStorage.setItem( VIEWED_KEY, JSON.stringify( viewed ) );
		} catch ( error ) {}
	}

	/* Swatches: buttons that set WooCommerce's dropdown (out of sight), whose script picks the variation. */

	function syncSwatches( scope ) {
		( scope || document ).querySelectorAll( '.themor-swatches-wrap' ).forEach( ( wrap ) => {
			const select = wrap.querySelector( 'select' );
			if ( ! select ) {
				return;
			}
			wrap.querySelectorAll( '.themor-swatch' ).forEach( ( button ) => {
				const value = button.getAttribute( 'data-value' );
				const option = [ ...select.options ].find( ( item ) => item.value === value );
				button.classList.toggle( 'is-unavailable', ! option || option.disabled );
				button.setAttribute( 'aria-checked', String( select.value === value ) );
			} );
			if ( wrap.hasAttribute( 'data-themor-stock' ) ) {
				stockNotes( wrap, select );
			}
		} );
	}

	/* What's left of each choice: the form's variations, narrowed by the other options chosen. */

	function variationsOf( form ) {
		if ( ! form ) {
			return [];
		}
		if ( ! form.themorVariations ) {
			let list = [];
			try {
				list = JSON.parse( form.getAttribute( 'data-product_variations' ) || '[]' );
			} catch ( error ) {}
			// A product with many variations loads them one by one: nothing to read.
			form.themorVariations = Array.isArray( list ) ? list : [];
		}
		return form.themorVariations;
	}

	function stockNotes( wrap, select ) {
		const form = wrap.closest( 'form' );
		const variations = variationsOf( form );
		let words = null;
		try {
			words = JSON.parse( wrap.getAttribute( 'data-themor-stock' ) );
		} catch ( error ) {}
		if ( ! words || ! variations.length ) {
			return;
		}
		const name = select.getAttribute( 'data-attribute_name' ) || select.name;
		const selects = [ ...form.querySelectorAll( '.variations select' ) ];
		const chosen = {};
		selects.forEach( ( other ) => {
			const key = other.getAttribute( 'data-attribute_name' ) || other.name;
			if ( key !== name && other.value ) {
				chosen[ key ] = other.value;
			}
		} );
		// Every other option chosen: each swatch leads to one variation.
		const complete = Object.keys( chosen ).length >= selects.length - 1;
		const fits = ( variation, value, narrowed ) => {
			const attributes = variation.attributes || {};
			if ( attributes[ name ] && attributes[ name ] !== value ) {
				return false;
			}
			return ! narrowed || Object.keys( chosen ).every( ( key ) => ! attributes[ key ] || attributes[ key ] === chosen[ key ] );
		};
		const free = ( variation ) => variation.is_in_stock && false !== variation.is_purchasable;
		wrap.querySelectorAll( '.themor-swatch' ).forEach( ( button ) => {
			const value = button.getAttribute( 'data-value' );
			const here = variations.filter( ( variation ) => fits( variation, value, true ) );
			const open = here.filter( free );
			const soldOut = here.length > 0 && ! open.length;
			let note = '';
			if ( soldOut ) {
				note = words.out;
			} else if ( complete && 1 === open.length ) {
				const left = parseInt( open[ 0 ].themor_left, 10 );
				if ( left > 0 && left <= words.low ) {
					note = words.left[ left - 1 ] || '';
				}
			} else if ( ! complete && open.length && words.free.length ) {
				note = words.free[ Math.min( open.length, words.free.length ) - 1 ];
			}
			button.classList.toggle( 'is-sold-out', soldOut );
			button.classList.toggle( 'is-low', '' !== note && ! soldOut && complete );
			// Nothing left whatever else is chosen: it can't be picked.
			if ( soldOut && ! variations.some( ( variation ) => fits( variation, value, false ) && free( variation ) ) ) {
				button.setAttribute( 'aria-disabled', 'true' );
			} else {
				button.removeAttribute( 'aria-disabled' );
			}
			const holder = button.querySelector( '.themor-swatch__note' );
			if ( holder ) {
				holder.textContent = note;
			}
		} );
	}

	const changed = ( select ) => ( $ ? $( select ).trigger( 'change' ) : select.dispatchEvent( new Event( 'change', { bubbles: true } ) ) );

	document.addEventListener( 'click', ( event ) => {
		const button = event.target.closest && event.target.closest( '.themor-swatch' );
		const select = button && button.closest( '.themor-swatches-wrap' ).querySelector( 'select' );
		if ( ! select || 'true' === button.getAttribute( 'aria-disabled' ) ) {
			return;
		}
		const form = button.closest( 'form' );
		const value = button.getAttribute( 'data-value' );
		const ruledOut = ! [ ...select.options ].some( ( item ) => item.value === value );
		// An option the other choices rule out, or leave nothing of: start again from it.
		if ( value && ( ruledOut || button.classList.contains( 'is-sold-out' ) ) && form ) {
			form.querySelectorAll( '.variations select' ).forEach( ( other ) => {
				other.value = '';
			} );
			changed( select );
		}
		select.value = select.value === value ? '' : value;
		changed( select );
		syncSwatches( form || document );
	} );

	if ( $ ) {
		$( document ).on( 'woocommerce_update_variation_values reset_data found_variation check_variations', '.variations_form', function () {
			syncSwatches( this );
		} );
	}

	/* Quantity buttons: minus and plus beside WooCommerce's quantity field. */

	function addQtyButtons( scope ) {
		if ( ! data.qtyButtons ) {
			return;
		}
		( scope || document ).querySelectorAll( '.quantity:not(.themor-qty)' ).forEach( ( box ) => {
			const input = box.querySelector( 'input.qty' );
			if ( ! input || 'hidden' === input.type ) {
				return;
			}
			box.classList.add( 'themor-qty' );
			const make = ( step, label, text ) => {
				const button = document.createElement( 'button' );
				button.type = 'button';
				button.className = 'themor-qty__button';
				button.setAttribute( 'data-themor-step', step );
				button.setAttribute( 'aria-label', label );
				button.textContent = text;
				return button;
			};
			input.before( make( '-1', i18n.less || '-', '−' ) );
			input.after( make( '1', i18n.more || '+', '+' ) );
		} );
	}

	document.addEventListener( 'click', ( event ) => {
		const button = event.target.closest && event.target.closest( '[data-themor-step]' );
		const input = button && button.parentNode.querySelector( 'input.qty' );
		if ( ! input || input.disabled || input.readOnly ) {
			return;
		}
		const step = parseFloat( input.step ) > 0 ? parseFloat( input.step ) : 1;
		const min = '' === input.min ? 0 : parseFloat( input.min );
		const max = '' === input.max || parseFloat( input.max ) < 0 ? Infinity : parseFloat( input.max );
		const current = parseFloat( input.value ) || 0;
		const value = Math.min( max, Math.max( min, current + step * Number( button.getAttribute( 'data-themor-step' ) ) ) );
		if ( value === current ) {
			return;
		}
		input.value = String( Math.round( value * 1000 ) / 1000 );
		// The cart page's Update cart listens for `input`.
		input.dispatchEvent( new Event( 'input', { bubbles: true } ) );
		changed( input );
	} );

	if ( $ ) {
		$( document.body ).on( 'updated_wc_div updated_cart_totals', () => addQtyButtons() );
	}

	/* A product's video: its button onto the gallery. */

	const videoButton = document.querySelector( '.themor-video-button' );
	const gallery = videoButton && document.querySelector( '.woocommerce-product-gallery' );
	if ( gallery ) {
		gallery.append( videoButton );
	}

	/* The gallery's arrows: at the sides of the main image, whose height the thumbnails don't share. */

	const arrowsGallery = document.querySelector( '.woocommerce-product-gallery' );
	if ( arrowsGallery && 'ResizeObserver' in window ) {
		const placeArrows = () => {
			const viewport = arrowsGallery.querySelector( '.flex-viewport' );
			if ( ! viewport ) {
				return;
			}
			arrowsGallery.style.setProperty( '--themor-gallery-arrows-top', `${ Math.round( viewport.offsetTop + viewport.offsetHeight / 2 ) }px` );
			arrowsGallery.style.setProperty( '--themor-gallery-arrows-left', `${ viewport.offsetLeft }px` );
			arrowsGallery.style.setProperty( '--themor-gallery-arrows-right', `${ arrowsGallery.clientWidth - viewport.offsetLeft - viewport.offsetWidth }px` );
		};
		// The slider builds its viewport once the images load, which changes the gallery's size.
		new window.ResizeObserver( placeArrows ).observe( arrowsGallery );
		placeArrows();
	}

	/* The sticky summary: below a header that stays on screen, and one taller than the window by its bottom. */

	const summary = document.querySelector( '.themor-sticky-summary div.product .summary' );
	if ( summary ) {
		const header = data.header ? document.querySelector( data.header ) : null;
		const fitSummary = () => {
			const gap = 24;
			const adminBar = parseFloat( getComputedStyle( root ).getPropertyValue( '--wp-admin--admin-bar--height' ) ) || 0;
			let top = adminBar + gap;
			if ( header && [ 'sticky', 'fixed' ].includes( getComputedStyle( header ).position ) ) {
				top += header.offsetHeight;
			}
			summary.style.setProperty( '--themor-summary-top', `${ Math.round( Math.min( top, window.innerHeight - summary.offsetHeight - gap ) ) }px` );
		};
		window.addEventListener( 'resize', fitSummary, { passive: true } );
		if ( 'ResizeObserver' in window ) {
			new window.ResizeObserver( fitSummary ).observe( summary );
		}
		fitSummary();
	}

	/* Accordion and sections: a link to a part (such as "customer reviews") opens it. */

	const openPart = ( hash ) => {
		const target = hash && hash.length > 1 ? document.getElementById( decodeURIComponent( hash.slice( 1 ) ) ) : null;
		const part = target && target.closest( 'details.themor-tab' );
		if ( part ) {
			part.open = true;
		}
	};
	document.addEventListener( 'click', ( event ) => {
		const link = event.target.closest && event.target.closest( 'a[href^="#"]' );
		if ( link ) {
			openPart( link.getAttribute( 'href' ) );
		}
	} );
	openPart( window.location.hash );

	/* Frequently bought together: the ticked products' total, and one button for all of them. */

	const money = ( amount ) => {
		const format = data.money || {};
		const decimals = Number.isInteger( format.decimals ) ? format.decimals : 2;
		const [ whole, part ] = Number( amount ).toFixed( decimals ).split( '.' );
		const number = whole.replace( /\B(?=(\d{3})+(?!\d))/g, format.thousands || '' ) + ( part ? ( format.decimal || '.' ) + part : '' );
		return ( format.format || '%1$s%2$s' ).replace( '%1$s', format.symbol || '' ).replace( '%2$s', number );
	};

	document.addEventListener( 'change', ( event ) => {
		const box = event.target.closest && event.target.closest( '[data-themor-together]' );
		if ( ! box ) {
			return;
		}
		const ticked = [ ...box.querySelectorAll( 'input[type="checkbox"]:checked' ) ];
		box.querySelector( '[data-themor-together-total]' ).textContent = money( ticked.reduce( ( sum, input ) => sum + ( Number( input.getAttribute( 'data-price' ) ) || 0 ), 0 ) );
		box.querySelector( '[data-themor-together-add]' ).disabled = ! ticked.length;
	} );

	document.addEventListener( 'click', async ( event ) => {
		const button = event.target.closest && event.target.closest( '[data-themor-together-add]' );
		if ( ! button || button.getAttribute( 'aria-busy' ) ) {
			return;
		}
		const ids = [ ...button.closest( '[data-themor-together]' ).querySelectorAll( 'input[type="checkbox"]:checked' ) ].map( ( input ) => input.value );
		if ( ! ids.length ) {
			return;
		}
		const body = new FormData();
		body.set( 'ids', ids.join( ',' ) );
		button.classList.add( 'loading' );
		button.setAttribute( 'aria-busy', 'true' );
		try {
			const response = await fetch( endpoint( 'themor_add_many' ), { method: 'POST', body, credentials: 'same-origin' } );
			const result = await response.json();
			if ( result.error ) {
				throw new Error( 'not added' );
			}
			applyFragments( result.fragments );
			button.classList.add( 'added' );
			if ( $ ) {
				$( document.body ).trigger( 'added_to_cart', [ result.fragments, result.cart_hash, $( button ) ] );
			} else {
				afterAdd();
			}
		} catch ( error ) {
			button.textContent = i18n.error || '';
		} finally {
			button.classList.remove( 'loading' );
			button.removeAttribute( 'aria-busy' );
		}
	} );

	/* The wishlist: kept in this browser, and in a logged-in shopper's account. */

	const wishData = data.wishlist;
	const WISH_KEY = 'themor-shop-wishlist';
	let wishes = [];
	try {
		wishes = JSON.parse( localStorage.getItem( WISH_KEY ) || '[]' ).filter( Number.isInteger );
	} catch ( error ) {}

	const saveWishes = () => {
		try {
			localStorage.setItem( WISH_KEY, JSON.stringify( wishes ) );
		} catch ( error ) {}
		if ( wishData && wishData.nonce ) {
			const body = new FormData();
			body.set( 'ids', wishes.join( ',' ) );
			body.set( 'nonce', wishData.nonce );
			fetch( endpoint( 'themor_wishlist' ), { method: 'POST', body, credentials: 'same-origin' } ).catch( () => {} );
		}
	};

	function markWishes() {
		document.querySelectorAll( '[data-themor-wish]' ).forEach( ( button ) => {
			button.setAttribute( 'aria-pressed', String( wishes.includes( Number( button.getAttribute( 'data-themor-wish' ) ) ) ) );
		} );
		document.querySelectorAll( '[data-themor-wish-count]' ).forEach( ( count ) => {
			count.textContent = String( wishes.length );
			count.hidden = ! wishes.length;
		} );
	}

	if ( wishData ) {
		// A logged-in shopper's account list joins this browser's.
		if ( Array.isArray( wishData.saved ) ) {
			const joined = [ ...new Set( [ ...wishes, ...wishData.saved ] ) ];
			const differs = joined.length !== wishData.saved.length;
			wishes = joined;
			if ( differs ) {
				saveWishes();
			} else {
				try {
					localStorage.setItem( WISH_KEY, JSON.stringify( wishes ) );
				} catch ( error ) {}
			}
		}
		markWishes();

		document.addEventListener( 'click', ( event ) => {
			const button = event.target.closest && event.target.closest( '[data-themor-wish]' );
			if ( ! button ) {
				return;
			}
			event.preventDefault();
			const id = Number( button.getAttribute( 'data-themor-wish' ) );
			wishes = wishes.includes( id ) ? wishes.filter( ( item ) => item !== id ) : [ id, ...wishes ];
			saveWishes();
			markWishes();
			const card = button.closest( '.themor-wishlist__item' );
			if ( card ) {
				card.remove();
				const list = document.querySelector( '[data-themor-wishlist]' );
				list.querySelector( '.themor-wishlist__empty' ).hidden = !! list.querySelector( '.themor-wishlist__item' );
			}
		} );

		const wishlist = document.querySelector( '[data-themor-wishlist]' );
		if ( wishlist ) {
			const empty = wishlist.querySelector( '.themor-wishlist__empty' );
			if ( ! wishes.length || ! data.storeApi ) {
				empty.hidden = false;
			} else {
				( async () => {
					try {
						const url = new URL( data.storeApi, window.location.href );
						url.searchParams.set( 'include', wishes.join( ',' ) );
						url.searchParams.set( 'per_page', String( Math.min( 100, wishes.length ) ) );
						const response = await fetch( url, { credentials: 'same-origin' } );
						const items = new Map( ( await response.json() ).map( ( item ) => [ item.id, item ] ) );
						const list = wishlist.querySelector( 'ul' );
						wishes.forEach( ( id ) => {
							if ( ! items.has( id ) ) {
								return;
							}
							const card = viewedCard( items.get( id ) );
							card.classList.add( 'themor-wishlist__item' );
							const remove = document.createElement( 'button' );
							remove.type = 'button';
							remove.className = 'themor-wish themor-wish--remove';
							remove.setAttribute( 'data-themor-wish', String( id ) );
							remove.setAttribute( 'aria-pressed', 'true' );
							remove.setAttribute( 'aria-label', ( wishData.i18n || {} ).remove || '' );
							remove.textContent = '×';
							card.append( remove );
							list.append( card );
						} );
						empty.hidden = !! list.children.length;
					} catch ( error ) {
						empty.hidden = false;
					}
				} )();
			}
		}
	}

	/* Filtering without reloading: WooCommerce's filters, sort order and page links change the products in place. */

	if ( data.ajaxFilters && window.history && window.DOMParser ) {
		const FILTER_LINKS = '.widget_layered_nav, .widget_layered_nav_filters, .widget_rating_filter, .woocommerce-widget-layered-nav, .widget_price_filter, .woocommerce-pagination';
		const FILTER_FORMS = '.woocommerce-ordering, .widget_price_filter form';
		let controller = null;

		const load = async ( url, push ) => {
			if ( controller ) {
				controller.abort();
			}
			controller = new AbortController();
			root.classList.add( 'themor-shop-busy' );
			try {
				const response = await fetch( url, { credentials: 'same-origin', signal: controller.signal } );
				const page = new DOMParser().parseFromString( await response.text(), 'text/html' );
				( data.regions || [] ).forEach( ( selector ) => {
					const now = document.querySelector( selector );
					const then = page.querySelector( selector );
					if ( now && then ) {
						now.innerHTML = then.innerHTML;
					}
				} );
				document.title = page.title;
				if ( push ) {
					window.history.pushState( { themorShop: true }, '', url );
				}
				enhance( document );
				initPager();
				const list = document.querySelector( 'ul.products, .woocommerce-info' );
				if ( list && list.getBoundingClientRect().top < 0 ) {
					list.scrollIntoView( { block: 'start', behavior: 'smooth' } );
				}
				if ( $ ) {
					$( document.body ).trigger( 'init_price_filter' );
					$( document.body ).trigger( 'post-load' );
				}
			} catch ( error ) {
				if ( 'AbortError' !== error.name ) {
					window.location.href = url;
				}
			} finally {
				root.classList.remove( 'themor-shop-busy' );
			}
		};

		document.addEventListener( 'click', ( event ) => {
			const link = event.target.closest && event.target.closest( 'a[href]' );
			if ( ! link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.origin !== window.location.origin || ! link.closest( FILTER_LINKS ) ) {
				return;
			}
			event.preventDefault();
			close( link.closest( 'dialog' ) );
			load( link.href, true );
		} );

		const submitForm = ( form ) => {
			const url = new URL( form.getAttribute( 'action' ) || window.location.href, window.location.href );
			new FormData( form ).forEach( ( value, key ) => {
				if ( '' === value ) {
					url.searchParams.delete( key );
				} else {
					url.searchParams.set( key, value );
				}
			} );
			url.searchParams.delete( 'paged' );
			close( form.closest( 'dialog' ) );
			load( url.href, true );
		};

		// WooCommerce's own sort order submits its form outright; this takes its place.
		document.addEventListener(
			'change',
			( event ) => {
				const select = event.target;
				const form = select.matches && select.matches( 'select.orderby' ) && select.closest( '.woocommerce-ordering' );
				if ( form ) {
					event.stopPropagation();
					submitForm( form );
				}
			},
			true
		);

		document.addEventListener( 'submit', ( event ) => {
			const form = event.target.closest && event.target.closest( FILTER_FORMS );
			if ( form && 'post' !== ( form.getAttribute( 'method' ) || 'get' ).toLowerCase() ) {
				event.preventDefault();
				submitForm( form );
			}
		} );

		window.addEventListener( 'popstate', () => load( window.location.href, false ) );
	}

	/* What each new part of the page needs: swatches, quantity buttons, hearts, the grid or list. */

	function enhance( scope ) {
		syncSwatches( scope );
		addQtyButtons( scope );
		if ( wishData ) {
			markWishes();
		}
		let saved = '';
		try {
			saved = localStorage.getItem( VIEW_KEY ) || '';
		} catch ( error ) {}
		if ( ( 'grid' === saved || 'list' === saved ) && document.querySelector( '[data-themor-view]' ) ) {
			setView( saved, false );
		}
	}

	enhance( document );

	/* Back-in-stock alerts: the form sends without leaving the page; for a product with options, it shows once a sold-out one is chosen. */

	document.querySelectorAll( '[data-themor-stock-alert]' ).forEach( ( form ) => {
		const message = form.querySelector( '.themor-stock-alert__message' );
		form.addEventListener( 'submit', ( event ) => {
			event.preventDefault();
			const button = form.querySelector( 'button' );
			button.disabled = true;
			window
				.fetch( endpoint( 'themor_stock_alert' ), { method: 'POST', credentials: 'same-origin', body: new FormData( form ) } )
				.then( ( response ) => response.json() )
				.then( ( json ) => {
					message.textContent = json?.data?.message || i18n.error;
					form.classList.toggle( 'is-done', !! json?.success );
				} )
				.catch( () => {
					message.textContent = i18n.error;
				} )
				.finally( () => {
					button.disabled = false;
				} );
		} );
		const variations = $ && form.closest( '.summary, .product' )?.querySelector( 'form.variations_form' );
		if ( variations ) {
			$( variations )
				.on( 'found_variation', ( event, variation ) => {
					form.hidden = !! variation.is_in_stock;
					form.querySelector( '[name="variation"]' ).value = variation.variation_id;
					message.textContent = '';
					form.classList.remove( 'is-done' );
				} )
				.on( 'reset_data hide_variation', () => {
					form.hidden = true;
				} );
		}
	} );

	/* Urgency: each sale's countdown, then "The sale has ended." */

	const ends = document.querySelectorAll( '[data-themor-ends]' );
	if ( ends.length ) {
		const pad = ( number ) => String( number ).padStart( 2, '0' );
		const tick = () => {
			ends.forEach( ( line ) => {
				const left = Math.max( 0, Number( line.getAttribute( 'data-themor-ends' ) ) * 1000 - Date.now() );
				if ( ! left ) {
					( line.querySelector( '[data-themor-text]' ) || line ).textContent = line.getAttribute( 'data-themor-ended' ) || '';
					line.removeAttribute( 'data-themor-ends' );
					return;
				}
				const time = line.querySelector( 'time' );
				const seconds = Math.floor( left / 1000 );
				const days = Math.floor( seconds / 86400 );
				const clock = pad( Math.floor( ( seconds % 86400 ) / 3600 ) ) + ':' + pad( Math.floor( ( seconds % 3600 ) / 60 ) ) + ':' + pad( seconds % 60 );
				if ( time && time.hasAttribute( 'data-themor-short' ) ) {
					// Hours and minutes only, such as 3h 20m.
					const hours = Math.floor( seconds / 3600 );
					const minutes = Math.max( 1, Math.ceil( ( seconds % 3600 ) / 60 ) );
					time.textContent = hours
						? ( i18n.hm || '%1$dh %2$dm' ).replace( '%1$d', String( hours ) ).replace( '%2$d', String( Math.min( 59, minutes ) ) )
						: ( i18n.m || '%dm' ).replace( '%d', String( minutes ) );
				} else if ( time ) {
					time.textContent = days ? ( i18n.days || '%1$sd %2$s' ).replace( '%1$s', String( days ) ).replace( '%2$s', clock ) : clock;
				}
			} );
		};
		window.setInterval( tick, 1000 );
		tick();
	}

	/* Store hours: the closed bar counts down to the opening, then goes. */

	const closed = document.querySelector( '[data-themor-closed-until]' );
	if ( closed ) {
		const until = Number( closed.getAttribute( 'data-themor-closed-until' ) ) * 1000;
		const pad = ( number ) => String( number ).padStart( 2, '0' );
		let timer = 0;
		const tick = () => {
			const left = Math.max( 0, until - Date.now() );
			if ( ! left ) {
				window.clearInterval( timer );
				const bar = document.getElementById( 'themor-closed' );
				if ( bar ) {
					bar.hidden = true;
				}
				return;
			}
			const seconds = Math.floor( left / 1000 );
			const days = Math.floor( seconds / 86400 );
			const time = pad( Math.floor( ( seconds % 86400 ) / 3600 ) ) + ':' + pad( Math.floor( ( seconds % 3600 ) / 60 ) ) + ':' + pad( seconds % 60 );
			closed.textContent = days ? ( i18n.days || '%1$sd %2$s' ).replace( '%1$s', String( days ) ).replace( '%2$s', time ) : time;
		};
		timer = window.setInterval( tick, 1000 );
		tick();
	}

	/* Store hours: the open bar goes when orders stop. */

	const openBar = document.querySelector( '[data-themor-open-until]' );
	if ( openBar ) {
		const until = Number( openBar.getAttribute( 'data-themor-open-until' ) ) * 1000;
		let timer = 0;
		const check = () => {
			if ( Date.now() >= until ) {
				openBar.hidden = true;
				window.clearInterval( timer );
			}
		};
		timer = window.setInterval( check, 15000 );
		check();
	}

	/*
	 * Store hours: each status line follows the time, from the changes the page was given
	 * ([ time stamp, open, words ], in order), so a page kept by a cache still says the truth.
	 */

	document.querySelectorAll( '[data-themor-store-status]' ).forEach( ( line ) => {
		let steps = [];
		try {
			steps = JSON.parse( line.getAttribute( 'data-themor-store-status' ) || '[]' );
		} catch ( error ) {}
		const text = line.querySelector( '.themor-store-status__text' );
		if ( ! text || ! Array.isArray( steps ) || ! steps.length ) {
			return;
		}
		const update = () => {
			const now = Date.now() / 1000;
			let step = null;
			for ( const each of steps ) {
				if ( each[ 0 ] > now ) {
					break;
				}
				step = each;
			}
			if ( ! step ) {
				return;
			}
			if ( text.textContent !== step[ 2 ] ) {
				text.textContent = step[ 2 ];
			}
			line.classList.toggle( 'themor-store-status--open', !! step[ 1 ] );
			line.classList.toggle( 'themor-store-status--closed', ! step[ 1 ] );
		};
		update();
		window.setInterval( update, 30000 );
	} );
} )();
