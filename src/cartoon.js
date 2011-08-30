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
 *  assigned to it.
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
 *  source image.
 *
 *
 *
 *  Options
 *  =======
 *
 *  In short
 *  --------
 *
 *  all:
 *      options: frame {width, height}, h/v (default h)
 *
 *  mode1: movie (fixed sequence, fixed delay/fps)
 *      options: delay/fps, #frames, loop?
 *
 *  mode2: sequence (fixed delay/fps, the sequence of individual frames is separately specified)
 *      options: delay/fps, frame sequence, loop?
 *
 *  mode3: varsequence (var delay, the sequence of individual frames is separately specified)
 *      options: frame+delay sequence, loop?
 *
 *
 *
 *  General options
 *  ---------------
 *      These options are common to all cartoon modes.
 *
 *      mode: "movie" | "sequence" | "varsequence"
 *          "seq" is an alias for "sequence", and "varseq" is an alias for "varsequence"
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
 *      skipFirst
 *
 *  Movie mode options
 *  ------------------
 *      delay: the delay between two frames in ms
 *          defaults to 100, values smaller than 10 won't be accepted (this may change in the future)
 *      fps: frames per seconds
 *          overrides delay and sets it to 1000/fps
 *          not set by default, but delay defaults to 100 ms which translates to 10 fps
 *          should not exceed 100 or so, MUST not exceed 1000
 *      frameCount: number of frames in the source image
 *          You MUST set this option, otherwise the cartoon will not run.
 *
 *  Sequence mode options
 *  ---------------------
 *      has the same options like movie, except frameCount is not needed, instead we have
 *
 *      sequence: array of frame numbers
 *          the sequence specification; each element is a frame number
 *
 *  Varsequence mode options
 *  ------------------------
 *      The only option (besides the general options) is
 *
 *      sequence: array of frame numbers and delays
 *          the sequence specification
 *          every odd-numbered element is a frame number,
 *          every even-numbered element is the delay in ms to the next frame
 *          if the last frame number is the last element (i.e. sequence.length is odd), the animation
 *          is played only once,
 *          if the last frame number is followed by another delay (i.e. sequence.length is even), this
 *          overrides the loopDelay setting (TODO: want that?)
 *
 *
 */

(function ($) {


    /** Deals the CSS to display the frame with the given number.
     *
     *  Does nothing if the frame number is null (a convenience especially for you).
     *  Does not check if there actually is a frame with that number.
     *  Does not interfere with the sequence status in any way.
     */
    function _display_frame(frameno) {
        var s = this._settings;
        var x, y;

        if (frameno === null) return;

        if (s.orientation.charAt(0) === "h") {
            x = -(frameno * s.width + s.offsetX);
            y = -s.offsetY;
        } else {
            x = -s.offsetX;
            y = -(frameno * s.height + s.offsetY);
        }

        this._screen.css("background-position", x.toString() + "px " + y.toString() + "px");
    }




    /** Maps sequence numbers to frame numbers according to the configured playback mode.
     *
     *  Performs sanity checks on the sequence number and returns null, if it's not in
     *  range of the sequence. Note that 0 is a valid frame number, so you have to use
     *  === null when checking the return value.
     */
    function _seq2frame(seqno) {
        var s = this._settings;
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
        _display_frame.call(this, frameno);
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
        var frameno = _seq2frame.call(this, seqno);

        if (frameno !== null) {
            _display_frame.call(this, frameno);
            this._status.seqno = seqno;
        }
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
        var s = this._settings;
        var seqno = this._status.seqno;
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
            _display_frame.call(this, _seq2frame.call(this, seqno));
            this._status.seqno = seqno;
        }

        /* invoke last frame callback */
        if (progress === 2 && s.onLastFrame) s.onLastFrame(this);

        return progress;
    }





    function play() {
        var that = this;
        var s = that._settings;


        function X() {
            var progress;
            var delay;


            progress = that.step();

            switch (progress) {
                case 0:
                    that._status.timeout = null;
                    return;
                case 1:
                case 3:
                    // regular timeout
                    if (s.mode === "varsequence") {
                        // note: seqno was already updated by step() which is what we want
                        delay = s.sequence[2 * that._status.seqno + 1];
                    } else {
                        delay = s.delay;
                    }

                    break;

                case 2:
                    // last seqno: set loop timeout if loop enabled, otherwise stop
                    if (s.loop) {
                        if (s.mode === "varsequence") {
                            // note: seqno was already updated by step() which is what we want
                            delay = s.sequence[2 * that._status.seqno + 1] || s.loopDelay || s.delay;
                        } else {
                            delay = s.loopDelay || s.delay;
                        }

                    } else {
                        that._status.timeout = null;
                        return;
                    }

                    break;
            }

            that._status.timeout = window.setTimeout(X, delay);
        }


        // already playing?
        if (this._status.timeout !== null) return this;


        X();

        return this;
    }




    /** Stops the cartoon.
     *  Does not change the current sequence position.
     */
    function stop() {
        var timeout = this._status.timeout;
        if (timeout !== null) {             // can the timeoutID actually be 0?
            window.clearTimeout(timeout);
            this._status.timeout = null;
        }

        return this;
    }



    /** Returns the cartoon's current sequence number, i.e. the position within the animation.
     *  This is null if the cartoon has not yet started.
     */
    function getSequenceNumber() {
        return this._status.seqno;
    }



    /** Returns the screen element, i.e. the element in which the cartoon is displayed,
     *  as a jQuery result set.
     *
     *  This can be useful to identify the screen element from a callback function,
     *  which gets the
     */
    function getScreen() {
        return this._settings.screen;
    }






    /** Cartoon setup function which attaches a cartoon object to the element on which this is called.
     *  Returns the cartoon object, on which methods can be called then.
     *
     *  The settings are used to modify the builtin default settings.
     *
     *  If there already is a cartoon object initialised for this element, that one is retrieved and
     *  returned. In this case, the settings, if supplied, are merged into the existing settings. This
     *  can be used to modify settings on an operational cartoon. Take care not to mess things up if
     *  you do this.
     */

    $.fn.cartoon = function (settings) {

        var screen, cartoon;


        /** Merges the settings passed with the current settings in the cartoon object
         *  after some sanity checks and adjustments
         */
        function merge_settings(settings) {
            if (settings) {
                // translate fps to delay
                if (settings.fps)
                    settings.delay = 1000 / settings.fps;
                // adjust delay for minimum
                if (settings.delay && settings.delay < 10)
                    settings.delay = 10;

                if (settings.mode) {
                    if (settings.mode.toLowerCase().indexOf("seq") === 0)
                        settings.mode = "sequence";
                    if (settings.mode.toLowerCase().indexOf("var") === 0)
                        settings.mode = "varsequence";
                }

                // merge with defaults
                $.extend(cartoon._settings, settings);
            }
        }



        /* narrow down the jQuery selection to only one matched element */
        screen = this.length === 1 ? this : this.first();



        /* check if a cartoon is already assigned to this element, take that one,
         *  otherwise create a new cartoon object from default values
         *  then merge the given settings
         */
        cartoon = this.data('cartoon') || {
            _screen: screen,
            _settings: {
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
                sequence: [ ],
                onLastFrame: null
            },

            _status: {
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
            getScreen: getScreen
        };

        merge_settings(settings);


        /* some sanity checks */
        switch (cartoon._settings.mode) {
            case "movie":
                if (!cartoon._settings.frameCount)
                    $.error("Frame count not set in movie mode!");
                break;
            case "sequence":
            case "varsequence":
                if (!cartoon._settings.sequence.length)
                    $.error("No playback sequence given!");
                break;
            default:
                $.error('Unkown playback mode: ' + cartoon._settings.mode);
        }


        /* attach the cartoon object to the element in case the user looses it */
        screen.data('cartoon', cartoon);

        return cartoon;
    };
}(jQuery));


