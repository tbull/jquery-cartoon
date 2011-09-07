/*
 *  Terminology
 *  ===========
 *
 *  "Frame" is a single image within the source image. The source image is composed of many
 *  individual frames all put together into one big image.
 *  "Frame count" is the total number of frames contained in the source image.
 *  "Frame number" is the index of a frame within the source image. The frames are numbered
 *  from 0 to (frame count - 1).
 *  "Orientation" is how the frames are arranged within the source image. This can be either
 *  horizontal or vertical. Horizontal is if the source image is a long row of frames, vertical
 *  is if the source image is a tall column of frames.
 *
 *  "Sequence" specifies in which order the individual frames are to be successively displayed
 *  to render the cartoon. Depending on the playback mode, this may or may not coincide with
 *  the order of frames within the source image.
 *  "Sequence number" is the position within the sequence. Each sequence number has a frame number
 *  assigned to it. That frame is often just called "the frame". For example, "the first frame"
 *  means the frame associated with the sequence number 0 rather than frame number 0.
 *
 *
 *  Playback modes
 *  ==============
 *
 *  The Cartoon plugin knows three modes of operation, the so-called "playback modes": movie,
 *  sequence and varsequence. The playback modes determines how the sequence of frames to
 *  display is figured out.
 *
 *  In movie mode, the sequence simply consists of all frames in the order of appearance in the
 *  source image. The sequence numbers equal the frame numbers. The frames are played from first
 *  through last (subject to the 'skipFirst' setting), like in a movie.
 *
 *  In sequence mode, the sequence is specified by an array of frame numbers. This way, it is
 *  possible to jump back and forth in the source picture, so that the same frame can be shown
 *  several times in an animation. Obviously, the sequence length can be much larger than the
 *  frame count then.
 *
 *  The varsequence mode takes the idea of sequences one step further. While the delay between
 *  frames is constant in sequence mode, an individual delay is specified for each frame in
 *  varsequence mode. Thus, the sequence array is twice as big, as each frame number is followed
 *  by the delay to wait after that frame.
 *
 *
 *  Invocation
 *  ==========
 *
 *  To set up the cartoon, create a cartoon object like this:
 *
 *      var cartoon = $("#id").cartoon(options);
 *
 *  where options is a simple key-value object which maps option names to values. Most options
 *  are optional (this wording appears redundant), being supplemented by default values, but
 *  some must be supplied.
 *
 *  The cartoon object then offers these public methods to call:
 *
 *      play()                  starts playing the cartoon
 *      stop()                  stops playing the cartoon
 *      step()                  advances the animation by one step
 *      rewind()                rewinds the cartoon to the beginning, i.e. sequence number 0
 *      skipTo(seqno)           displays the frame assigned to the given sequence number
 *      displayFrame(frameno)   displays the frame with the given frame number
 *      getSequenceNumber()     returns the cartoon's current sequence number
 *      getScreen()             returns the screen element
 *      configure(options)      modifies the configuration of the cartoon
 *      destroy()               destroys the cartoon
 *
 *  Unless documented otherwise, all public functions return the cartoon object for chaining.
 *
 *
 *  Options
 *  =======
 *
 *  General options
 *  ---------------
 *      These options are common to all cartoon modes.
 *
 *      mode: "movie" | "sequence" | "varsequence"
 *          "seq" is an alias for "sequence", and "varseq" is an alias for "varsequence"
 *          Default is "movie".
 *      width: the width of a frame in the source image
 *          default is the width of the screen element
 *      height: the height of a frame in the source image
 *          default is the height of the screen element
 *      orientation: "h" | "v"
 *          "h" if the frames in the source image are composed to a row (horizontally arranged),
 *          "v" if the frames in the source image are composed to a column (vertically arranged)
 *          default is "h"
 *      offsetX:
 *      offsetY:
 *
 *      onLastFrame: function (cartoon)
 *          a callback to be invoked once the last frame is displayed. the cartoon object is
 *          passed as an argument. if the cartoon is played in a loop, the invocation takes place
 *          once per loop. default is null
 *      loop: true | false
 *          whether to display the animation in a loop, i.e. start over at the end
 *      loopDelay: the delay between the last frame and the first
 *          if loop == true, you can use this to specify a custom delay when the movie starts over,
 *          otherwise it defaults the standard delay
 *          a value of 0 is treated as if this option were not present
 *      skipFirst: skip the first sequence number
 *          This applies only to the very first play() after the cartoon was set up. When looping or
 *          rewind()ing, the first frame will always be shown. The idea is that the first frame
 *          is probably already showing on page load because the background picture was set up so by
 *          static CSS.
 *
 *  Movie mode options
 *  ------------------
 *      delay: the delay between two frames in ms
 *          Defaults to 100, values smaller than 10 won't be accepted (this may change in the future).
 *      fps: frames per seconds
 *          Overrides delay and sets it to 1000/fps. Not set by default, but delay defaults to 100 ms
 *          which translates to 10 fps. Should not exceed 100 or so, MUST not exceed 1000.
 *      frameCount: number of frames in the source image
 *          You MUST set this option, otherwise the cartoon will not run.
 *
 *  Sequence mode options
 *  ---------------------
 *      Has the same options (and default values) like movie mode, except frameCount is not needed,
 *      instead we have
 *
 *      sequence: array of frame numbers
 *          The sequence specification; each element is a frame number.
 *
 *  VarSequence mode options
 *  ------------------------
 *      The only option (besides the general options) is
 *
 *      sequence: array of frame numbers and delays
 *          The sequence specification.
 *          Each odd-numbered element is a frame number,
 *          each even-numbered element is the delay in ms to the next frame.
 *          If the last frame number is the last element (i.e. sequence.length is odd), the animation
 *          is played only once, if the last frame number is followed by another delay (i.e.
 *          sequence.length is even), this overrides the loopDelay setting (TODO: want that?)
 *
 *
 */

(function ($) {


    /****   Auxiliary functions that need not be part of the inner closure.     ****/


        /** Creates a default settings object for the given screen
         *  usable as a base for further adjustments.
         */
        function default_settings(screen) {
            return {
                mode: "movie",
                width: screen.width(),
                height: screen.height(),
                orientation: "h",
                offsetX: 0,
                offsetY: 0,
                delay: 100,
                frameCount: 0,
                skipFirst: false,
                loop: false,
                loopDelay: 0,
                sequence: null,
                onLastFrame: null
            };
        }




        /** Merges the settings passed into the target settings
         *  after some sanity checks and adjustments.
         *
         *  We have this separate from configure() to retain the free
         *  choice of the target object.
         */
        function merge_settings(target, settings) {
            if (!settings) return;

            // translate fps to delay; non-numeric values are rejected
            if (settings.fps) {
                settings.fps *= 1;
                if (settings.fps) settings.delay = 1000 / settings.fps;
            }

            // adjust delay for minimum; non-numeric values are rejected
            if (settings.delay) {
                settings.delay *= 1;
                if (settings.delay) {
                    if (settings.delay < 10) settings.delay = 10;
                } else {
                    delete settings.delay;
                }
            }

            // allow abbreviations for the mode word
            if (settings.mode) {
                if (settings.mode.toLowerCase().indexOf("seq") === 0)
                    settings.mode = "sequence";
                if (settings.mode.toLowerCase().indexOf("var") === 0)
                    settings.mode = "varsequence";
            }

            // merge with target
            $.extend(target, settings);
        }







    /** Cartoon setup function which attaches a cartoon object to the element on which it is called.
     *  Returns the cartoon object, on which methods can then be called.
     *
     *  The settings are used to modify the builtin default settings. It's a simple key-value map with
     *  the keys being the documented options.
     *
     *  If there already is a cartoon object initialised for this element, that one is retrieved and
     *  returned. In this case, the settings, if supplied, are merged into the existing settings. This
     *  can be used to modify settings on an operational cartoon. Take care not to mess things up if
     *  you do this.
     */

    $.fn.cartoon = function (settings) {

        var screen, state, s, cartoon;




        /** Modifies the configuration of the cartoon.
         *  The argument is the same as passed to the cartoon creation function.
         *
         *  This will modify the settings of a running cartoon without further questions.
         *  This may or may not have immediate effect. Take care not to mess things up.
         *  To be on the safe side, stop() the cartoon, then configure(), then rewind()
         *  before play()ing.
         */
        function configure(settings) {
            merge_settings(s, settings);
            return this;
        }




        /** Deals the CSS to display the frame with the given number.
         *
         *  Does nothing if the frame number is null (a convenience especially for you).
         *  Does not check if there actually is a frame with that number.
         *  Does not interfere with the sequence status in any way.
         */
        function display_frame(frameno) {
            var x, y;

            if (frameno === null) return;

            if (s.orientation.charAt(0) === "h") {
                x = -(frameno * s.width + s.offsetX);
                y = -s.offsetY;
            } else {
                x = -s.offsetX;
                y = -(frameno * s.height + s.offsetY);
            }

            screen.css("background-position", x.toString() + "px " + y.toString() + "px");
        }




        /** Maps sequence numbers to frame numbers according to the configured playback mode.
         *
         *  Performs sanity checks on the sequence number and returns null, if it's not in
         *  range of the sequence. Note that 0 is a valid frame number, so you have to use
         *  === null when checking the return value.
         */
        function seq2frame(seqno) {
            var frameno;

            /* sanitize for lower bound */
            if (seqno < 0) seqno = 0;

            /* lookup the frame number assigned to the sequence number, thereby sanitizing for the
             *  upper sequence number bound */
            switch (s.mode) {
                case "movie":
                    // in movie mode, the frameno equals the seqno
                    if (seqno >= s.frameCount) return null;
                    frameno = seqno;
                    break;
                case "sequence":
                    if (seqno >= s.sequence.length) return null;
                    frameno = s.sequence[seqno];
                    break;
                case "varsequence":
                    if (seqno >= Math.floor((s.sequence.length + 1) / 2)) return null;
                    frameno = s.sequence[2 * seqno];
                    break;
                //default: return null;
            }

            return frameno;
        }




        /** Displays the frame with the given frame number.
         *
         *  Does not check if there actually is a frame with that number. If there's not,
         *  you'll probably won't see anything.
         *
         *  Does not change the status of the cartoon, in particular doesn't stop the
         *  cartoon if it's currently playing or modify its sequence number.
         */
        function displayFrame(frameno) {
            display_frame(frameno);
            return this;
        }




        /** Displays the frame assigned to the given sequence number.
         *
         *  Performs sanity checks on the sequence number and adjusts it, if it's not in
         *  range of the configured sequence. (details remain unspecified and are subject to change)
         *
         *  Does not stop the cartoon if it's currently playing.
         */
        function skipTo(seqno) {
            var frameno = seq2frame.call(this, seqno);

            if (frameno !== null) {
                display_frame(frameno);
                this._state.seqno = seqno;
            }
            // else?

// TODO: invoke onLastFrame callback

            return this;
        }




        /** Rewinds the cartoon to the beginning, i.e. sequence number 0.
         *  Does not stop the cartoon if it's currently playing.
         */
        function rewind() {
            return this.skipTo(0);
        }




        /** Advances the animation by one step.
         *
         *  Adjusts status accordingly (updates seqno).
         *
         *  Returns a number indicating the animation progress:
         *      0   - no more frames to play (nothing changed)
         *      1   - ok, next frame in sequence displayed
         *      2   - like 1, and this is the last frame in the sequence (callback triggered)
         *      3   - like 1, and we just wrapped around
         *
         */
        function step() {
            var seqno = state.seqno;
            var seqlen;
            var progress;


            /* figure out the sequence length */
            switch (s.mode) {
                case "movie":
                    seqlen = s.frameCount;
                    break;
                case "sequence":
                    seqlen = s.sequence.length;
                    break;
                case "varsequence":
                    seqlen = Math.floor((s.sequence.length + 1) / 2);
                    break;
            }


            /* make up the next sequence number to be displayed,
             *  not yet taking sequence range into account */
            if (seqno === null) {
                seqno = s.skipFirst ? 1 : 0;
            } else {
                seqno++;
            }


            /* adjust seqno for the upper range bound and set status accordingly */
            if (seqno >= seqlen) {
                // the new seqno is beyond sequence range
                //  wrap around if looping is enabled
                if (s.loop) {
                    seqno = 0;
                    progress = 3
                } else {
                    progress = 0;
                }
            } else if (seqno === seqlen - 1) {
                // the new seqno is the last one in the sequence
                progress = 2;
            } else {
                // just any seqno
                progress = 1;
            }


            /* display the thing (unless nothing to display) */
            if (progress !== 0) {
// TODO: check seq2frame return value
                display_frame(seq2frame.call(this, seqno));
                state.seqno = seqno;
            }

            /* invoke last frame callback */
            if (progress === 2 && s.onLastFrame) s.onLastFrame(this);

            return progress;
        }




        /** Starts playing the cartoon.
         *
         *  Continues with the sequence number following that where it left off. If the end of the
         *  sequence was already reached before and looping is disabled, this won't have any effect.
         *  In that case, use rewind() first.
         */
        function play() {
            var that = this;


            function X() {
                var progress;
                var delay;


                progress = that.step();

                switch (progress) {
                    case 0:
                        state.timeout = null;
                        return;
                    case 1:
                    case 3:
                        // regular timeout
                        if (s.mode === "varsequence") {
                            // note: seqno was already updated by step() which is what we want
                            delay = s.sequence[2 * that._state.seqno + 1];
                        } else {
                            delay = s.delay;
                        }

                        break;

                    case 2:
                        // last seqno: set loop timeout if loop enabled, otherwise stop
                        if (s.loop) {
                            if (s.mode === "varsequence") {
                                // note: seqno was already updated by step() which is what we want
                                delay = s.sequence[2 * that._state.seqno + 1] || s.loopDelay || s.delay || 1000;
                            } else {
                                delay = s.loopDelay || s.delay || 1000;
                            }

                        } else {
                            state.timeout = null;
                            return;
                        }

                        break;
                }

                state.timeout = window.setTimeout(X, delay);
            }


            // already playing?
            if (state.timeout !== null) return this;


            X();

            return this;
        }




        /** Stops playing the cartoon.
         *  Does not change the current sequence position.
         */
        function stop() {
            if (state.timeout !== null) {               // can the timeoutID actually be 0?
                window.clearTimeout(state.timeout);
                state.timeout = null;
            }

            return this;
        }




        /** Returns the cartoon's current sequence number, i.e. the position within the animation.
         *  This is null if the cartoon has not yet started.
         */
        function getSequenceNumber() {
            return state.seqno;
        }




        /** Returns the screen element, i.e. the element in which the cartoon is displayed,
         *  as a jQuery result set. Most of the time this is the jQuery object that you
         *  initially called the cartoon() method on.
         *
         *  This can be useful to identify the screen element from a callback function,
         *  which gets the passed the cartoon object as an argument.
         */
        function getScreen() {
            return screen;
        }




        /** Dissociates the cartoon object from the screen element.
         *
         *  This makes resources eligible for garbage collection. Use this if the lifetime
         *  of a cartoon is shorter than the page lieftime, i.e. the cartoon is only temporarily
         *  displayed. You may set up another cartoon on the same screen element later.
         */
        function destroy() {
            this.stop().rewind();
            screen.data('cartoon', null);
            screen = state = s = this._screen = this._settings = this._state = null;
        }






        /****   Ok, let's begin.    ****/

        /* narrow down the jQuery selection to only one matched element */
        screen = this.length === 1 ? this : this.first();


        /* Check if a cartoon is already associated with this element.
         *  If so, take that one, otherwise create a new cartoon object from default values.
         *  WARNING: If we pick up an already existing cartoon, our private variables here
         *  are not properly initialized. Private methods might therefore not work.
         */
        cartoon = screen.data('cartoon') || {
            _screen: screen,
            _settings: default_settings(screen),
            _state: {
                timeout: null,          /* if non-null, we're currently play()ing */
                seqno: null             /* current sequence number */
            },

            play: play,
            stop: stop,
            step: step,
            rewind: rewind,
            skipTo: skipTo,
            displayFrame: displayFrame,
            getSequenceNumber: getSequenceNumber,
            getScreen: getScreen,
            configure: configure,
            destroy: destroy
        };


        /* Set up our local vars to point to the cartoon's state and settings.
         *  Our methods will then work on the closured vars, saving access to the cartoon properties
         *  with much longer names (this saves us bytes on minification).
         *  One noteworthy point is that in case we work on an earlier created cartoon (extracted by screen.data())
         *  the public methods of that object and private methods called from there will work on the earlier
         *  created closure, while private methods called directly from here don't have access to that closure;
         *  they access /our/ closure instead. That's why the local vars of both closures must point to the same
         *  objects. Therefore we init our closure's private vars from the state saved in the cartoon object.
         */
        screen = cartoon._screen;
        s = cartoon._settings;
        state = cartoon._state;


        /* now merge supplied settings to existing config */
        merge_settings(s, settings);



        /* some sanity checks */
        switch (s.mode) {
            case "movie":
                if (!s.frameCount)
                    $.error("Frame count not set in movie mode!");
                break;
            case "sequence":
            case "varsequence":
                if (!s.sequence.length)
                    $.error("No playback sequence given!");
                break;
            default:
                $.error('Unkown playback mode: ' + s.mode);
        }


        /* attach the cartoon object to the element in case the user looses it */
        screen.data('cartoon', cartoon);

        return cartoon;
    };
}(jQuery));
