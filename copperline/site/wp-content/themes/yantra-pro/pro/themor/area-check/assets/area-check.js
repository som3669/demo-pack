/**
 * Area check: a code sent with a block's form is looked up in the block's areas (the form's
 * `data-themor-area-check`) as the page looks it up without scripts (AreaCheck::find()), and the
 * answer shows under the field without the page reloading. Each block answers on its own.
 */
( function () {
	/** The spaces in codes: tabs, line breaks, spaces and non-breaking spaces (AreaCheck::SPACES). */
	var SPACES = /[\u0009-\u000d  ]+/g;

	/**
	 * A code as codes compare: trimmed, its spaces made one, its letters a to z in capitals
	 * (AreaCheck::clean()).
	 *
	 * @param {string} code Code.
	 * @return {string} The code, clean.
	 */
	function clean( code ) {
		return String( code )
			.replace( SPACES, ' ' )
			.replace( /^ | $/g, '' )
			.replace( /[a-z]/g, function ( letter ) {
				return letter.toUpperCase();
			} );
	}

	/**
	 * Whether a listed code takes in a typed one, both clean: the same code, or a longer form of
	 * it, the listed code followed by a space or a hyphen and more (43214-1234 and 43214 1234 for
	 * 43214, BS1 4DJ for BS1) or, with nothing between, by exactly the last part of a UK
	 * postcode, a digit and two letters (BS14DJ for BS1, but not BS104DJ) (AreaCheck::matches()).
	 *
	 * @param {string} listed The code listed.
	 * @param {string} typed  The code typed.
	 * @return {boolean} Whether it takes it in.
	 */
	function matches( listed, typed ) {
		if ( '' === listed || 0 !== typed.indexOf( listed ) ) {
			return false;
		}
		var rest = typed.slice( listed.length );
		return '' === rest || ' ' === rest.charAt( 0 ) || '-' === rest.charAt( 0 ) || /^[0-9][A-Z]{2}$/.test( rest );
	}

	/**
	 * The first area, in the order they are listed, with a code that takes in the one typed, and
	 * the place's name on that code's line (AreaCheck::find()).
	 *
	 * @param {Array}  areas The block's areas: `slug`, `message`, `codes` (code, place pairs).
	 * @param {string} code  The code typed, clean.
	 * @return {Object|null} `area` and `place`, or null when no area covers the code.
	 */
	function find( areas, code ) {
		for ( var i = 0; i < areas.length; i++ ) {
			var codes = areas[ i ].codes || [];
			for ( var j = 0; j < codes.length; j++ ) {
				if ( matches( String( codes[ j ][ 0 ] ), code ) ) {
					return { area: areas[ i ], place: String( codes[ j ][ 1 ] || '' ) };
				}
			}
		}
		return null;
	}

	/**
	 * A text with its {words} put in, in one pass, as AreaCheck::answer() does with strtr(): each
	 * by words, or by a copy of an element.
	 *
	 * @param {string} text   Text.
	 * @param {Object} values {word} => words or an element.
	 * @return {DocumentFragment} The text.
	 */
	function fill( text, values ) {
		var out = document.createDocumentFragment();
		String( text ).split( /(\{[a-z]+\})/ ).forEach( function ( piece ) {
			var value = Object.prototype.hasOwnProperty.call( values, piece ) ? values[ piece ] : piece;
			if ( 'string' !== typeof value ) {
				out.appendChild( value.cloneNode( true ) );
			} else if ( '' !== value ) {
				out.appendChild( document.createTextNode( value ) );
			}
		} );
		return out;
	}

	/**
	 * Words in bold.
	 *
	 * @param {string|Node} content Words, or the elements they are in.
	 * @return {HTMLElement} A `strong` element.
	 */
	function bold( content ) {
		var strong = document.createElement( 'strong' );
		strong.appendChild( 'string' === typeof content ? document.createTextNode( content ) : content );
		return strong;
	}

	/**
	 * A form's answer to a code, in its answer's place: the icon (copied from the form's
	 * template), then the place and the code in bold and the area's answer, or the answer for
	 * codes not covered with the code in bold (AreaCheck::answer()). The area's name, as a slug,
	 * is the answer's `data-themor-area`, for styling.
	 *
	 * @param {HTMLFormElement} form   The form.
	 * @param {HTMLElement}     result Its answer's place.
	 * @param {Object}          data   Its areas and how the answers read.
	 * @param {string}          code   The code typed, clean.
	 */
	function answer( form, result, data, code ) {
		var match = find( data.areas || [], code );
		var text = document.createElement( 'span' );
		text.className = 'themor-area-check__text';
		if ( match ) {
			var where = match.place ? fill( data.place, { '{place}': match.place, '{code}': code } ) : code;
			text.appendChild(
				fill( data.found, {
					'{where}': bold( where ),
					'{answer}': fill( match.area.message, { '{code}': bold( code ) } ),
				} )
			);
		} else {
			text.appendChild( fill( data.missing, { '{code}': bold( code ) } ) );
		}
		var icons = form.querySelector( 'template.themor-area-check__icons' );
		// By its class attribute: some engines' class selectors miss an SVG in a template's content.
		var icon = icons && icons.content ? icons.content.querySelector( '[class~="themor-area-check__icon--' + ( match ? 'found' : 'missing' ) + '"]' ) : null;
		if ( icon ) {
			result.appendChild( document.importNode( icon, true ) );
		}
		result.appendChild( text );
		result.classList.add( 'themor-area-check__answer--' + ( match ? 'found' : 'missing' ) );
		if ( match && match.area.slug ) {
			result.setAttribute( 'data-themor-area', match.area.slug );
		}
	}

	document.addEventListener( 'submit', function ( event ) {
		var form = event.target;
		if ( ! form || ! form.hasAttribute || ! form.hasAttribute( 'data-themor-area-check' ) ) {
			return;
		}
		var input = form.querySelector( '.themor-area-check__input' );
		var result = form.querySelector( '.themor-area-check__answer' );
		var data = null;
		try {
			data = JSON.parse( form.getAttribute( 'data-themor-area-check' ) );
		} catch ( error ) {
			// Without its areas, the form reloads the page, which answers.
			return;
		}
		if ( ! input || ! result || ! data ) {
			return;
		}
		event.preventDefault();
		result.textContent = '';
		result.classList.remove( 'themor-area-check__answer--found', 'themor-area-check__answer--missing' );
		result.removeAttribute( 'data-themor-area' );
		var code = clean( input.value );
		if ( '' === code ) {
			input.focus();
			return;
		}
		answer( form, result, data, code );
	} );
}() );
