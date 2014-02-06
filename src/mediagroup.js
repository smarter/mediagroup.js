/*!
 * mediagroup.js
 *
 * Copyright 2011, Rick Waldron
 * Licensed under MIT license.
 *
 * http://www.whatwg.org/specs/web-apps/current-work/multipage/the-video-element.html#assigning-a-media-controller-declaratively
 */
(function( window, document, mediagroup ) {
	// Unary Array.from()
	// https://gist.github.com/1074126
	Array.from = function( arrayish ) {
		return [].slice.call( arrayish );
	};

	function mediaGroup( group, elements ) {

		var controller, slaves,
			ready = 0;

		// Get the single controller element
		controller = elements.filter(function( elem ) {
			return !!elem.controls || elem.getAttribute("controls", true);
		})[ 0 ];

		// Filter nodelist for all elements that will
		// be controlled by the	controller element
		slaves = elements.filter(function( elem ) {
			return !elem.controls;
		});

		if ( !controller ) {
			return;
		}

		// Declare context sensitive `canplay` handler
		function canPlay() {

			if ( ++ready === elements.length ) {

				// Now that it is safe to play the video, remove the handlers
				elements.forEach(function( elem ) {
					elem.removeEventListener( "canplay", canPlay, false );
				});
			}
		}

		// MediaController shim
		var mediaController = new Object();
		mediaController.play = function() {
			controller.play();
			slaves.forEach(function( slave ) {
				slave.play();
			});
		};
		mediaController.pause = function() {
			controller.pause();
			slaves.forEach(function( slave ) {
				slave.pause();
				// We cannot synchronize the videos here because at least in
				// Firefox, controller.currentTime is incorrect after calling
				// pause(). The workaround is to listen on the pause event, see below.
				//slave.currentTime = controller.currentTime;
			});
		};
		mediaController.unpause = mediaController.play;
		Object.defineProperty(mediaController, "currentTime", {
			get: function() { return controller.currentTime; },
			set: function( time ) {
				controller.currentTime = time;
				slaves.forEach(function( slave ) {
					slave.currentTime = time;
				});
			}
		});
		Object.defineProperty(mediaController, "played", {
			get: function() { return controller.played; }
		});
		Object.defineProperty(mediaController, "paused", {
			get: function() { return controller.paused; }
		});


		// Iterate all elements in mediagroup set
		// Add `canplay` event listener, this ensures that setting currentTime
		// doesn't throw exception (Code 11) by tripping seek on a media element
		// that is not yet seekable
		elements.forEach(function( elem ) {

			// Set the actual element IDL property `mediaGroup`
			elem.mediaGroup = elem.getAttribute( mediagroup );

			elem.controller = mediaController;

			elem.addEventListener( "canplay", canPlay, false );
		});

		controller.addEventListener( "pause", function(e) {
			if (controller.duration == controller.currentTime ) {
				return;
			}
			slaves.forEach(function( slave ) {
				// Keep the videos synchronized. At this point,
				// controller.currentTime should be correct.
				slave.currentTime = controller.currentTime;
			});
		}, false);
	}

	function mediaGroupSetup( selector ) {
		// Declare program references
		// nodelist: a NodeList of all elements with `mediagroup` attributes
		// elements: `nodelist` as a real Array
		// filtereds: object whose properties are the value of a `mediagroup` attribute,
		//            with values that are arrays of corresponding elements
		// mediagroups: unique array of each mediagroup name
		var nodelist = document.querySelectorAll( selector || "[" + mediagroup + "]" ),
			elements = Array.from( nodelist ),
			filtereds = {},
			mediagroups;

			// Allow only if no `mediaGroup` property exists
			elements = elements.filter(function( elem ) {
				return !elem.mediaGroup;
			});

			// Filter for groupnames
			mediagroups = elements.map(function( elem ) {
				return elem.getAttribute( mediagroup );
			}).filter(function( val, i, array ) {
				if ( !filtereds[ val ] ) {
					filtereds[ val ] = elements.filter(function( elem ) {
						return elem.getAttribute( mediagroup ) === val;
					});
					return true;
				}
				return false;
			});

		// Iterate all collected mediagroup names
		// Call mediaGroup() with group name and nodelist params
		mediagroups.forEach(function( group ) {
			mediaGroup( group, filtereds[ group ] );
		});
	}

	// Listen for mutation events
	[ "DOMNodeInserted", "DOMAttrModified" ].forEach(function( mutation ) {

		document.addEventListener( mutation, function( event ) {

			// Feature detect for mediagroup support.
			// If Host has support, return and do nothing.
			if ( "mediaGroup" in document.createElement("video") ) {
				return;
			}

			var element = event.target,
			valid = [ "AUDIO", "VIDEO" ].some(function( val ) {
				return element.nodeName === val;
			});

			if ( valid && !element.mediaGroup &&
					(element.controls || element.getAttribute("controls") === "true") ) {

				window.setTimeout(function() {
					mediaGroupSetup( "[" + mediagroup + "='" + element.getAttribute( mediagroup ) + "']" );
				}, 100 );
			}
		});
	});

	// Autocreate mediagroup sets when DOM is ready
	document.addEventListener( "DOMContentLoaded", function() {

		// Feature detect for mediagroup support.
		// If Host has support, return and do nothing.
		if ( "mediaGroup" in document.createElement("video") ) {
			return;
		}

		mediaGroupSetup();

	}, false );

	// TODO: How to ensure that new nodes with mediagroup attrs are recognized

})( this, this.document, "mediagroup" );
