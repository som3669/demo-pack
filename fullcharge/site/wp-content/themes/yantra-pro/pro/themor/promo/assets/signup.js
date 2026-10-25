/**
 * Sign-up form: each block's form (includes/Signup.php) is sent without leaving the page. An
 * address that can't be one is caught first: the field is marked and the block's live region
 * says "Enter an email address like name@example.com.". Otherwise the form goes to the site
 * (`ajax=1`, answered in JSON); once signed up, the live region says the block's thanks and the
 * field is emptied, else it says what went wrong. The words are the block's own, written by the
 * site (`data-themor-signup`). Without this script the form is sent as a page, which comes back
 * with how it went. Blocks that come in later (a popup's content loaded when it opens) are sent
 * the same way.
 */
( function () {
	var SELECTOR = 'form.themor-signup[data-themor-signup]';

	/**
	 * A block's words: `success`, `invalid` and `error`.
	 *
	 * @param {HTMLFormElement} form The form.
	 * @return {Object} Its words.
	 */
	function words( form ) {
		try {
			return JSON.parse( form.getAttribute( 'data-themor-signup' ) ) || {};
		} catch ( error ) {
			return {};
		}
	}

	/**
	 * Say something through the block's live region: emptied first, so the same words said again
	 * are heard again.
	 *
	 * @param {HTMLFormElement} form  The form.
	 * @param {string}          text  What to say.
	 * @param {string}          state `is-done` or `is-error`.
	 */
	function say( form, text, state ) {
		var status = form.querySelector( '.themor-signup__status' );
		if ( ! status ) {
			return;
		}
		status.classList.remove( 'is-done', 'is-error' );
		status.classList.add( state );
		status.textContent = '';
		window.setTimeout( function () {
			status.textContent = text || '';
		}, 100 );
	}

	/**
	 * A form set up once: the browser's own checks give way to the block's words.
	 *
	 * @param {HTMLFormElement} form The form.
	 */
	function start( form ) {
		if ( ! form.themorSignup ) {
			form.themorSignup = true;
			form.noValidate = true;
		}
	}

	/**
	 * Start the forms in a part of the page, itself included.
	 *
	 * @param {Element|Document} root Where to look.
	 */
	function scan( root ) {
		if ( root.matches && root.matches( SELECTOR ) ) {
			start( root );
		}
		if ( root.querySelectorAll ) {
			Array.prototype.forEach.call( root.querySelectorAll( SELECTOR ), start );
		}
	}

	document.addEventListener( 'submit', function ( event ) {
		var form = event.target && event.target.closest ? event.target.closest( SELECTOR ) : null;
		if ( ! form || ! window.fetch || ! window.FormData ) {
			return;
		}
		event.preventDefault();
		start( form );
		var text = words( form );
		var field = form.querySelector( '.themor-signup__email' );
		if ( ! field || form.getAttribute( 'aria-busy' ) ) {
			return;
		}
		field.value = field.value.trim();
		if ( ! field.value || ! field.checkValidity() ) {
			field.setAttribute( 'aria-invalid', 'true' );
			say( form, text.invalid, 'is-error' );
			field.focus();
			return;
		}
		field.removeAttribute( 'aria-invalid' );
		form.setAttribute( 'aria-busy', 'true' );
		var body = new window.FormData( form );
		body.set( 'ajax', '1' );
		window
			.fetch( form.getAttribute( 'action' ), { method: 'POST', body: body, credentials: 'same-origin' } )
			.then( function ( response ) {
				return response.json();
			} )
			.then( function ( json ) {
				if ( json && json.success ) {
					field.value = '';
					say( form, text.success, 'is-done' );
					return;
				}
				var message = json && json.data && json.data.message ? json.data.message : text.error;
				if ( message === text.invalid ) {
					field.setAttribute( 'aria-invalid', 'true' );
				}
				say( form, message, 'is-error' );
			} )
			.catch( function () {
				say( form, text.error, 'is-error' );
			} )
			.then( function () {
				form.removeAttribute( 'aria-busy' );
			} );
	} );

	// Typing again takes the mark of a wrong address away.
	document.addEventListener( 'input', function ( event ) {
		var field = event.target;
		if ( field && field.classList && field.classList.contains( 'themor-signup__email' ) ) {
			field.removeAttribute( 'aria-invalid' );
		}
	} );

	scan( document );

	// Forms that come in later: a popup's content loaded when it opens, or any other.
	if ( 'MutationObserver' in window ) {
		new window.MutationObserver( function ( records ) {
			records.forEach( function ( record ) {
				Array.prototype.forEach.call( record.addedNodes, function ( node ) {
					if ( 1 === node.nodeType ) {
						scan( node );
					}
				} );
			} );
		} ).observe( document.documentElement, { childList: true, subtree: true } );
	}
}() );
