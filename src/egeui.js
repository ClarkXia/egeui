// EGEUI v0.1.7

(function(global, factory){
    // Set up egeui appropriately for the environment.
    if (typeof define === 'function' && define.cmd) {
        define("lib/egeui/0.1.7/egeui", ["jquery"], function(require, exports, module) {
            var $ = require('jquery');
            module.exports = factory($);
        });
    } else {
        global.egeui = factory(global.jQuery || global.$);
    }
}(this, function($){

    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function(searchElement, fromIndex) {
            if (this === undefined || this === null) {
                throw new TypeError('"this" is null or not defined');
            }
            var length = this.length >>> 0; // Hack to convert object.length to a UInt32
            fromIndex = +fromIndex || 0;
            if (Math.abs(fromIndex) === Infinity) {
                fromIndex = 0;
            }
            if (fromIndex < 0) {
                fromIndex += length;
                if (fromIndex < 0) {
                    fromIndex = 0;
                }
            }
            for (; fromIndex < length; fromIndex++) {
                if (this[fromIndex] === searchElement) {
                    return fromIndex;
                }
            }
            return -1;
        };
    }

    var $$ = function(obj) {
        return obj instanceof $ ? obj : $(obj)
    };

    /* Position UTILITY DEFINITION
     * ====================== */
    var Position = {};

    Position.pin = function(pinElem, baseObject) {
        pinElem = $$(pinElem);
        if(!pinElem[0]){
            throw new Error('Position Error: pin element not specified');
        }
        var collision = baseObject.collision || 'flip';
        var posTop, posLeft;

        var baseHeight, baseWidth, basePos;
        var pinHeight = pinElem.outerHeight(),
            pinWidth = pinElem.outerWidth();

        if(baseObject.top && baseObject.left){
            posTop = baseObject.top;
            posLeft = baseObject.left;
            baseHeight = baseWidth = 0;
        } else {
            var baseElem = $$(baseObject.elem);
            if(!baseElem[0]){
                throw new Error('Position Error: base element not specified');
            }
            basePos = baseElem.offset();
            var pinPos = baseObject.pos;

            baseHeight = baseElem.outerHeight();
            baseWidth = baseElem.outerWidth();

            if(pinPos.indexOf('top') > -1){
                posTop = basePos.top - pinHeight;
            }
            if(pinPos.indexOf('bottom') > -1){
                posTop = basePos.top + baseHeight;
            }
            if(pinPos === 'bottom' || pinPos === 'top'){
                posLeft = basePos.left;
            }
            if(pinPos.indexOf('right') > -1){
                posLeft = basePos.left + baseWidth;
            }
            if(pinPos.indexOf('left') > -1){
                posLeft = basePos.left - pinWidth;
            }
            if(pinPos === 'right' || pinPos === 'left'){
                posTop = basePos.top;
            }

            if(baseObject.offset){
                var offset = baseObject.offset.split(' ');
                if(offset[0].indexOf('%') > -1){
                    posTop -= parseInt(offset[0].slice(0, -1), 10) / 100 * pinHeight - baseHeight / 2;
                } else {
                    posTop += parseInt(offset[0], 10);
                }

                if(offset.length > 1){
                    if(offset[1].indexOf('%') > -1){
                        posLeft -= parseInt(offset[1].slice(0, -1), 10) / 100 * pinWidth - baseWidth / 2;
                    } else {
                        posLeft += parseInt(offset[1], 10);
                    }
                }
            }
        }

        // collision handle
        if(collision !== 'none'){
            var docST = $(document).scrollTop(), docSL = $(document).scrollLeft(),
                docH = $(document).height(), docW = $(document).width(),
                winH = $(window).height(), winW = $(window).width();

            if(posTop < docST){
                if(!basePos || basePos.top > docST){
                    if(collision === 'fit'){
                        posTop = docST;
                    } else if(collision === 'flip'){
                        posTop = posTop + pinHeight + baseHeight;
                        if(posTop + pinHeight > docH){
                            posTop = docH - pinHeight;
                        }
                    }
                }
            } else if(posTop + pinHeight - docST > winH){
                if(collision === 'fit'){
                    posTop = winH + docST - pinHeight;
                } else if(collision === 'flip'){
                    // +1: fix firefox bug
                    posTop = posTop - pinHeight - baseHeight + 1;
                    if(posTop < 0){
                        posTop = 0;
                    }
                }
            }

            if(posLeft < docSL){
                if(!basePos || basePos.left > docSL){
                    if(collision === 'fit'){
                        posLeft = docSL;
                    } else if(collision === 'flip'){
                        posLeft = posLeft + pinWidth + baseWidth;
                        if(posLeft + pinWidth > docW){
                            posLeft = docW - pinWidth;
                        }
                    }
                }
            } else if(posLeft + pinWidth - docSL > winW){
                if(collision === 'fit'){
                    posLeft = winW + docSL - pinWidth;
                } else if(collision === 'flip'){
                    posLeft = posLeft - pinWidth - baseWidth;
                    if(posLeft < 0){
                        posLeft = 0;
                    }
                }
            }
        }

        // offsetParent adjust
        var parentOffset = pinElem.offsetParent().offset();
        posLeft -= parentOffset.left;
        posTop -= parentOffset.top;

        pinElem.css({
            'top': posTop,
            'left': posLeft
        });
    };

    Position.center = function(pinElem, baseElem) {
        pinElem = $$(pinElem[0]);
        if(!pinElem){
            throw new Error('Position Error: pin element not specified');
        }
        baseElem = $$(baseElem || window);
        var posLeft = parseInt((baseElem.width() - pinElem.outerWidth()) / 2, 10);
        var posTop = baseElem.height() - pinElem.outerHeight();
        posTop = (posTop < 0 ? 0 : parseInt(posTop / 2, 10)) + $(document).scrollTop();

        pinElem.css({
            'top' : posTop,
            'left' : posLeft
        });
    };

    // widget base class
    var EVENT_KEY_SPLITTER = /^(\S+)\s*(.*)$/;
    var cidCounter = 0;
    var cachedInstances = {};
    function uniqueCid() {
        return 'widget-' + cidCounter++
    }

    // For memory leak
    $(window).unload(function() {
        try {
            for(var cid in cachedInstances) {
                cachedInstances[cid].destroy()
            }
        } catch(e){}
    })

    /* BASE CLASS DEFINITION
    * ====================== */
    var Base = function(){}
    Base.prototype = {
        on: function(event, fn, context){
            var event_arr = event.split(/\s+/);
            var that = this;
            $.each(event_arr, function(i, ev){
                var events = that._getEvents(ev, 'on');
                events.push([fn, context || that]);
            });
            return this;
        },
        before: function(event, fn, context){
            var events = this._getEvents(event, 'before');
            events.push([fn, context || this]);
            return this;
        },
        after: function(event, fn, context){
            var events = this._getEvents(event, 'after');
            events.push([fn, context || this]);
            return this;
        },
        trigger: function(event){
            var type = 'on';
            var args = Array.prototype.slice.call(arguments, 1);
            if(event === 'before' || event === 'after'){
                type = event;
                event = arguments[1];
                args = Array.prototype.slice.call(arguments, 2);
            }
            if(this._widgetEvents && this._widgetEvents[type] && this._widgetEvents[type][event]){
                var handlers = this._widgetEvents[type][event];
                for (var i = 0; i < handlers.length; i++) {
                    if ($.isFunction(handlers[i][0])) {
                        handlers[i][0].apply(handlers[i][1], args);
                    } else if(isString(handlers[i][0])) {
                        this[handlers[i][0]].apply(handlers[i][1], args);
                    }
                }
            }
        },
        _getEvents: function(event, type){
            this._widgetEvents = this._widgetEvents || {};
            var events = this._widgetEvents[type] || (this._widgetEvents[type] = {});
            return events[event] || (events[event] = []);
        }
    }

    Base.extend = function(protoProps, staticProps) {
        var parent = this;
        var child;

        // The constructor function for the new subclass is either defined by you
        // (the "constructor" property in your `extend` definition), or defaulted
        // by us to simply call the parent's constructor.
        if (protoProps && protoProps.hasOwnProperty('constructor')) {
            child = protoProps.constructor;
        } else {
            child = function(){ return parent.apply(this, arguments); };
        }

        // Add static properties to the constructor function, if supplied.
        $.extend(child, parent, staticProps);

        // Set the prototype chain to inherit from `parent`, without calling
        // `parent`'s constructor function.
        var Surrogate = function(){ this.constructor = child; };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate;

        // Add prototype properties (instance properties) to the subclass,
        // if supplied.
        if (protoProps) $.extend(child.prototype, protoProps);

        // Set a convenience property in case the parent's prototype is needed
        // later.
        child.superClass = parent.prototype;

        return child;
    };


    /* DRAG CLASS DEFINITION
    * ====================== */
    var Drag = Base.extend({
        constructor: function(options){
            var defaults = {
                placeClass : 'place-item',
                dragClass : 'drag-container',
                drop : '.drop',
                drag : '.drag',
                doCopy : false,
                revert : true,
                edge : 0,
                limitContainer : ''
            };
            this.options = $.extend({}, defaults, options);
            this.elem = $$(this.options.drag);
            if(!this.elem[0]){
                throw new Error('Drag Error: drag element not specified');
            }
            this.droppables = $$(this.options.drop);
            this.mouse = {
                offsetX   : 0,
                offsetY   : 0,
                startX    : 0,
                startY    : 0,
                lastX     : 0,
                lastY     : 0,
                nowX      : 0,
                nowY      : 0,
                distX     : 0,
                distY     : 0,
                dirAx     : 0,
                dirX      : 0,
                dirY      : 0,
                lastDirX  : 0,
                lastDirY  : 0,
                distAxX   : 0,
                distAxY   : 0
            };
            this.container = {
                x : 0,
                y : 0
            };
            this.touch = false;
            this.moving = false;
            this.disabled = false;

            this.setup();
        },
        setup: function(){
            var that = this;
            var startEvent = function(e){
                if (!!$(e.target).data('dropped')){
                    return;
                }
                that.touch = /^touch/.test(e.type);
                if (that.touch && e.touches.length !== 1) {
                    return;
                }
                that._dragStart(e.touches ? e.touches[0] : e)
            }
            var moveEvent = function(e){
                if(that.moving){
                    e.preventDefault();
                    that._dragMove(e.touches ? e.touches[0] : e);
                }
            }
            var stopEvent = function(e){
                if (that.moving){
                    e.preventDefault();
                    that._dragStop(e.touches ? e.touches[0] : e);
                }
            }
            if ('ontouchstart' in document) {
                that.elem[0].addEventListener('touchstart', startEvent, false);
                window.addEventListener('touchmove', moveEvent, false);
                window.addEventListener('touchend', stopEvent, false);
                window.addEventListener('touchcancel', stopEvent, false);
                this.removeTouchEvent = function(){
                    that.elem[0].removeEventListener('touchstart', startEvent, false);
                    window.removeEventListener('touchmove', moveEvent, false);
                    window.removeEventListener('touchend', stopEvent, false);
                    window.removeEventListener('touchcancel', stopEvent, false);
                }
            }

            that.elem.on('mousedown', startEvent);
            $(document).on('mousemove', moveEvent);
            $(document).on('mouseup', stopEvent);
            this.removeMouseEvent = function(){
                that.elem.off('mousedown', startEvent);
                $(document).off('mousemove', moveEvent);
                $(document).off('mouseup', stopEvent);
            }
        },
        _dragStart: function(e){
            if (this.disabled){return}
            var target = $(e.target),
                posLeft = 0,posTop = 0,
                position = target.position();

            this.dragData = {
                startPosition : target.css('position'),
                startLeft: position.left,
                startTop: position.top,
                startX: e.pageX,
                startY: e.pageY,
                marginLeft: parseInt(target.css('marginLeft') || 0),
                marginTop: parseInt(target.css('marginTop') || 0),
                target: target,
                parent: target.parent()
            };
            var mouse = this.mouse;
            mouse.offsetX = e.offsetX !== undefined ? e.offsetX : e.pageX - target.offset().left;
            mouse.offsetY = e.offsetY !== undefined ? e.offsetY : e.pageY - target.offset().top;
            mouse.startX = mouse.lastX = e.pageX;
            mouse.startY = mouse.lastY = e.pageY;

            var data = this.dragData;
            posLeft = data.target.offset().left - data.marginLeft;
            posTop = data.target.offset().top - data.marginTop;

            if (!!this.options.placeClass || this.options.doCopy){
                this.placeElem = '<div class=' + this.options.placeClass + '></div>';
                this.placeElem = $(this.placeElem);
                this.placeElem.css(this._copyPosition(target))
            }

            if (this.options.doCopy){
                var dragItem = target;
                this.dragElem = $(document.createElement('div')).addClass(this.options.dragClass);
                dragItem.after(this.placeElem);
                dragItem[0].parentNode.removeChild(dragItem[0]);
                dragItem.appendTo(this.dragElem);

                $(document.body).append(this.dragElem);
            } else {
                this.dragElem = target;
                !!this.placeElem && this.dragElem.before(this.placeElem);
                if (data.parent[0] != document.body){
                    this.container.x = data.parent.offset().left;
                    this.container.y = data.parent.offset().top;

                    posLeft -= this.container.x;
                    posTop -= this.container.y;
                }
            }
            this.dragElem.css({
                'position' : 'absolute',
                'left' : posLeft,
                'top'  : posTop
            });
            this.moving = true;
            this.trigger('dragstart');
        },
        _dragMove: function(e){
            if (this._checkArea(e) == false){return}
            var opt = this.options,
                that = this,
                mouse = this.mouse,
                data = this.dragData;
            this.dragElem.css({
                'left' : e.pageX - mouse.offsetX - this.container.x - data.marginLeft,
                'top'  : e.pageY - mouse.offsetY - this.container.y - data.marginTop
            });

            mouse.lastX = mouse.nowX;
            mouse.lastY = mouse.nowY;
            mouse.nowX  = e.pageX;
            mouse.nowY  = e.pageY;
            // distance mouse moved between events
            mouse.distX = mouse.nowX - mouse.lastX;
            mouse.distY = mouse.nowY - mouse.lastY;
            // direction mouse was moving
            mouse.lastDirX = mouse.dirX;
            mouse.lastDirY = mouse.dirY;
            // direction mouse is now moving (on both axis)
            mouse.dirX = mouse.distX === 0 ? 0 : mouse.distX > 0 ? 1 : -1;
            mouse.dirY = mouse.distY === 0 ? 0 : mouse.distY > 0 ? 1 : -1;

            //TODO:lock X Y
            this.droppables.each(function(){
                var dropObj = $(this),
                    dropOffset = dropObj.offset();

                if (mouse.nowX > dropOffset.left && mouse.nowX < dropOffset.left + dropObj.outerWidth()
                        && mouse.nowY > dropOffset.top && mouse.nowY < dropOffset.top + dropObj.outerHeight()){
                    //trigger dragenter and dragover
                    if (!$(this).data('entered')){
                        $(this).data('entered',true);
                        that.trigger('dragenter',this);
                    }
                    that.trigger('dragover',this);
                    //return true;
                } else {
                    //TODO trigger dragleave
                    //return false;
                    if(!!$(this).data('entered')){
                        that.trigger('dragleave',this);
                        $(this).data('entered',false);
                    }
                }
            })
            this.trigger('ondrag');
        },
        _dragStop: function(e){
            this.moving = false;
            this.trigger('dragStop');
            if (this.options.revert){
                if (this._checkDrop()){
                    this.trigger('drop');
                    this.dragData.target.data('dropped',true);
                } else {
                    this._revert();
                }
            } else {
                if (this._checkDrop()){
                    this.trigger('drop');
                    this.dragData.target.data('dropped',true);
                }
            }
            if (!!this.placeElem){
                var dragContainer = this.placeElem.closest('.' + this.options.dragClass);
                if (!dragContainer[0]){
                    this.placeElem.remove();
                } else {
                    dragContainer.remove();
                }
            }
            this.trigger('dragstop');
        },
        _copyPosition: function(obj){
            var cssProp = ['position', 'left', 'top', 'right', 'bottom', 'margin', 'padding', 'float'],
                cssCopy = {};
            for(var i = 0;i < cssProp.length;i++){
                cssCopy[cssProp[i]] = obj.css(cssProp[i]);
            }
            return cssCopy;
        },
        _revert: function(){
            //TODO use animate
            if (!!this.options.doCopy){
                var el = this.dragElem.children();
                el[0].parentNode.removeChild(el[0]);
                this.placeElem.replaceWith(el);
                this.dragElem.remove();
            } else {
                if (!!this.placeElem){
                    this.placeElem.remove();
                }
                this.dragElem.css({
                    'position' : this.dragData.startPosition,
                    'left' : this.dragData.startLeft,
                    'top' : this.dragData.startTop
                })
            }
        },
        _checkDrop: function(){
            //check drop area
            var mouse = this.mouse,
                opts = this.options,
                that = this,
                dropped = false;
            this.droppables.each(function(){
                var dropObj = $(this),
                    dropOffset = dropObj.offset();

                if (mouse.nowX > dropOffset.left && mouse.nowX < dropOffset.left + dropObj.outerWidth()
                        && mouse.nowY > dropOffset.top && mouse.nowY < dropOffset.top + dropObj.outerHeight()){
                    dropped = true;
                    $(this).data('entered',false);
                }
            })
            return dropped;
        },
        _checkArea: function(e){
            var container = $(this.options.limitContainer);
            if (!container[0]){
                return true;
            } else {
                var offset = container.offset(),
                    width = container.outerWidth(),
                    height = container.outerHeight(),
                    t = e.pageY - offset.top,
                    r = offset.left + width - e.pageX,
                    b = offset.top + height - e.pageY
                    l = e.pageX - offset.left;
                return Math.min(t,r,b,l) > this.options.edge;
            }
        },
        enable: function(){
            this.disabled = false;
        },
        disable: function(){
            this.disabled = true;
        },
        removeEvent: function(){
            this.touch && this.removeTouchEvent();
            this.removeMouseEvent();
        }
    })

    /* Widget CLASS DEFINITION
    * ====================== */
    var Widget = Base.extend({
        constructor: function(options) {
            this.options = options;
            this.setup();
        },
        rendered: false,
        setup: function(){
            var defaults = {
                parentNode: document.body
                // other initial options: element, template, id , className
            }
            var options = this.options = $.extend(defaults, this.options);

            this._isTemplate = !options.element;
            this.$element = $$(this.$element || options.element || options.template);
            if(!this.$element[0]){
                throw new Error('Overlay Error: element or template not specified');
            }
            this.element = this.$element[0];
            options.id && this.$element.attr('id', options.id);
            options.className && this.$element.addClass(options.className);
            options.themeClass && this.$element.addClass(options.themeClass);

            this.cid = uniqueCid();
            cachedInstances[this.cid] = this;
        },
        render: function(){
            if (!this.rendered) {
                this.rendered = true;
            }
            this.trigger('before', 'render')
            if(!isInDocument(this.element)){
                this.$element.appendTo(this.options.parentNode);
            }
            this.trigger('after', 'render');

            this._delegateEvents();

            return this;
        },
        destroy: function(){
            this.trigger('before', 'destroy')
            this.$element.off('.egeuiEvents' + this.cid);
            delete cachedInstances[this.cid];

            if(this._isTemplate){
                this.$element.remove();
            }

            this.trigger('after', 'destroy');
            this._widgetEvents = null;
            this.events = null;
            this.$element = null;
        },
        _delegateEvents: function(){
            var events = $.extend({}, this.events, this.options.events)
            if(events){
                for(var key in events){
                    if(events.hasOwnProperty(key)){
                        var match = key.match(EVENT_KEY_SPLITTER);
                        var  eventType = match[1] + '.egeuiEvents' + this.cid;
                        var selector = match[2] || undefined;

                        (function(handler, widget) {
                            var callback = function(ev) {
                                if ($.isFunction(handler)) {
                                    handler.call(widget, ev)
                                } else {
                                    widget[handler](ev)
                                }
                            }
                            // delegate
                            if (selector) {
                                if(match[1] === 'change'){
                                    widget.$element.find(selector).on(eventType, callback)
                                } else {
                                    widget.$element.on(eventType, selector, callback)
                                }
                            } else {
                                widget.$element.on(eventType, callback)
                            }
                        })(events[key], this)
                    }
                }
            }
        },
        $: function(select){
            return this.$element.find(select);
        }
    });

    /* Overlay WIDGET DEFINITION
     * ====================== */
    var Overlay = Widget.extend({
        setup: function(){
            var defaults = {
                // width, height, trigger, hideBlur, align
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 99,
                visible: false
            }
            var options = this.options = $.extend(defaults, this.options);

            Overlay.superClass.setup.call(this);

            this.$element.css({
                'position': options.position,
                'z-index': options.zIndex,
                'top': options.top,
                'left': options.left,
                'display': 'none'
            });
            options.width && this.$element.css('width', options.width);
            options.height && this.$element.css('height', options.height);

            if(options.align){
                options.align.after = options.align.after || 'render';
                this.after(options.align.after, this.align);
                delete(options.align.after);
            }
            options.visible && this.show();
        },
        render: function(){
            Overlay.superClass.render.call(this);
            // add to alignOverlays
            if(this.options.align){
                Overlay.alignOverlays.push(this);
            }
            if(this.options.hideBlur){
                this._hideBlur($$(this.options.trigger))
            }
            return this;
        },
        visible: false,
        align: function(posOption){
            posOption = posOption || this.options.align;
            if(posOption){
                if(posOption.pos === 'center'){
                    Position.center(this.$element, posOption.elem)
                } else {
                    Position.pin(this.$element, posOption)
                }
            }
            return this;
        },
        setPosition: function(pos){
            if(!this.rendered){
                this.render();
            }
            Position.pin(this.$element, pos);
            return this;
        },
        show: function() {
            if(!this.rendered){
                this.render();
            }
            // delay trigger hideblur when show event is contextmenu
            // to prevent click event immediately after contextmenu event
            // especially in Mac touchpad, contextmenu is double click
            if(this.options.hideBlur === 'contextmenu'){
                this.delayHideBlur = true;
                var that = this;
                setTimeout(function(){
                    delete(that.delayHideBlur);
                }, 100)
            }
            this.trigger('before', 'show')
            this.$element.show();
            this.trigger('after', 'show')
            this.visible = true;
            return this;
        },
        hide : function() {
            this.trigger('before', 'hide')
            this.$element.hide();
            this.trigger('after', 'hide')
            this.visible = false;
            return this;
        },
        destroy : function() {
            Overlay.superClass.destroy.call(this);
            erase(this, Overlay.blurOverlays);
            erase(this, Overlay.alignOverlays);
        },
        _hideBlur: function(arr, relativeOnly){
            arr = $.makeArray(arr);
            arr.push(this.element);
            this._relativeElements = arr;
            if(!relativeOnly){
                Overlay.blurOverlays.push(this);
            }
        }
    });

    // 绑定 resize 后重新定位
    Overlay.alignOverlays = [];
    var resizeTimer;
    var winWidth = $(window).width();
    var winHeight = $(window).height();

    $(window).resize(function () {
        resizeTimer && clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            var winNewWidth = $(window).width();
            var winNewHeight = $(window).height();

            if (winWidth !== winNewWidth || winHeight !== winNewHeight) {
                $(Overlay.alignOverlays).each(function (i, item) {
                    if(item) {
                        if(!isInDocument(item.element)){
                            throw new Error('Overlay Error: an instance element is not existed, it should be destroyed.')
                            return;
                        }
                        item.align();
                    }
                });
            }
            winWidth = winNewWidth;
            winHeight = winNewHeight;
            resizeTimer = null;
        }, 100);
    });

    // 绑定 blur 隐藏事件
    Overlay.blurOverlays = [];
    $(document).on('click', function (e) {
        hideBlurOverlays(e);
    });

    // hide blur overlays
    function hideBlurOverlays(e){
        $(Overlay.blurOverlays).each(function (index, item) {
            if (item) {
                if(!isInDocument(item.element)){
                    throw new Error('Overlay Error: an instance element is not existed, it should be destroyed.')
                    return;
                }
                if(item.delayHideBlur || !item.visible){
                    return;
                }
                for (var i = 0; i < item._relativeElements.length; i++) {
                    var el = item._relativeElements[i];
                    if (el === e.target || $.contains(el, e.target)) {
                        return;
                    }
                }
                item.hide();
            }
        })
    }

    function erase(target, array) {
        for (var i = 0; i < array.length; i++) {
            if (target === array[i]) {
                array.splice(i, 1);
                return array;
            }
        }
    }

    function isInDocument(element) {
        return $.contains(document.documentElement, element);
    }


    /* Popup WIDGET DEFINITION
     * ====================== */
    var EVENT_NAMESPACE = '.egeui-popup';

    var Popup = Overlay.extend({
        setup: function(){
            // other options: trigger, delegateNode, showAlign
            var defaults = {
                'triggerType': 'hover',
                'delay': 200
            }
            var options = this.options = $.extend(defaults, this.options);
            if(options.align && !options.align.elem){
                options.align.elem = options.trigger;
            }
            if(options.triggerType === 'click'){
                options.hideBlur = true;
            }

            Popup.superClass.setup.call(this);

            // this.render();
            this._bindTrigger();

            // 当使用委托事件时，_hideBlur 方法对于新添加的节点会失效 需要重新绑定
            if (options.delegateNode && options.hideBlur) {
                var that = this;
                this.before('show', function () {
                    this._hideBlur($$(options.trigger), true)
                });
            }

            if(this.options.showAlign){
                this.options.align = this.options.showAlign;
                this.after('show', function(){
                    this.options.showAlign.elem = this.activeTrigger;
                    this.align(this.options.showAlign)
                })
            }
        },

        _bindTrigger: function(){
            var triggerType = this.options.triggerType,
                trigger = this.options.trigger,
                delegateNode = this.options.delegateNode,
                delay = this.options.delay;
            var that = this;

            if(triggerType === 'click'){
                bindEvent('click', trigger, function(){
                    that.activeTrigger = this;
                    that.show()
                }, delegateNode);

            } else if(triggerType === 'focus'){
                bindEvent('focus', trigger, function () {
                    that.activeTrigger = this;
                    that.show();
                }, delegateNode);

                bindEvent('blur', trigger, function () {
                    setTimeout(function () {
                        (!that._downOnElement) && that.hide();
                        that._downOnElement = false;
                    }, delay);
                }, delegateNode);

                // 为了当input blur时能够选择和操作弹出层上的内容  ??
                bindEvent('mousedown', this.element, function (e) {
                    that._downOnElement = true;
                });

            } else {
                var showTimer, hideTimer;

                var leaveHandler = function (e) {
                    clearTimeout(showTimer);
                    showTimer = null;

                    if (that.visible) {
                        hideTimer = setTimeout(function () {
                            that.hide();
                        }, delay);
                    }
                }

                bindEvent('mouseenter', trigger, function(){
                    clearTimeout(hideTimer);
                    hideTimer = null;

                    that.activeTrigger = this;

                    showTimer = setTimeout(function(){
                        that.show()
                    }, delay)
                }, delegateNode);

                bindEvent('mouseleave', trigger, leaveHandler, delegateNode);

                // 鼠标在悬浮层上时不消失
                bindEvent('mouseenter', this.$element, function(){
                    clearTimeout(hideTimer);
                });
                bindEvent('mouseleave', this.$element, leaveHandler);

                bindEvent('mouseleave', 'select', function (e) {
                    e.stopPropagation();
                }, this.$element)
            }

            // remove trigger event when destroy
            this.before('destroy', function(){
                if(delegateNode){
                    $$(delegateNode).off(EVENT_NAMESPACE, trigger)
                } else {
                    $$(trigger).off(EVENT_NAMESPACE)
                }
                if(triggerType !== 'click'){
                    this.$element.off(EVENT_NAMESPACE)
                }
            })
        }
    })

    function bindEvent(type, element, fn, delegateNode){
        type += EVENT_NAMESPACE;
        if(delegateNode){
            $$(delegateNode).on(type, element, fn);
        } else {
            $$(element).on(type, fn);
        }
    }


    var Tip = Popup.extend({
        setup: function(){
            var defaults = {
                zIndex: '2999',
                pos: 'top',
                template: '<div class="egeui-tip"></div>'
            }

            var options = this.options = $.extend(defaults, this.options);

            if(!options.align){
                options.align = {
                    pos: options.pos,
                    offset: options.pos === 'top' || options.pos === 'bottom' ? '0 50%' : '50% 0',
                    collision: 'none'
                }
            }

            Tip.superClass.setup.call(this);

            if(options.delegateNode){
                this.before('show', function(){
                    this.setContent($$(this.activeTrigger));
                }).after('show', function(){
                    this.options.align.elem = this.activeTrigger;
                    this.align(this.options.align);
                });
                // TODO: fix non ascii char problem affect align
                if(!options.width){
                    this.$element.css('white-space', 'nowrap')
                }
            } else {
                this.setContent();
            }
            this.$element.addClass('tip-' + options.pos);
        },
        setContent: function(srcElement){
            srcElement = srcElement || $$(this.options.trigger);
            var content = this.options.content;
            if(!content && (srcElement.attr('title') || srcElement.attr('data-title'))){
                content = srcElement.attr('title') || srcElement.attr('data-title');
                lteIE9 ? srcElement.attr('title', '') : srcElement.removeAttr('title');
                srcElement.attr('data-title', content);
            }
            if(!content){
                throw new Error('Tip Error: content or title not specified.');
            }
            this.$element.html(content)
        }
    })

    /* Mask WIDGET DEFINITION
     * ====================== */
    var Mask = Overlay.extend({
        setup: function(){
            var defaults = {
                width: '100%',
                height: '100%',
                position: 'fixed',
                zIndex: 499,
                opacity: 0.5,
                backgroundColor: '#000',
                template: '<div class="egeui-mask"></div>'
            }
            var options = this.options = $.extend(defaults, this.options);

            Mask.superClass.setup.call(this);

            this.$element.css({
                'background-color': options.backgroundColor,
                'opacity': options.opacity
            }).attr('tabIndex', 0);
        }
    })


    /* Dialog WIDGET DEFINITION
     * ====================== */
    var Dialog = Overlay.extend({
        _dialogTpl: '<div class="{{classPrefix}}"></div>',
        _closeTpl: '<div class="{{classPrefix}}-close" data-role="close"></div>',
        _titleTpl: '<div class="{{classPrefix}}-title" data-role="title"></div>',
        _contentTpl: '<div class="{{classPrefix}}-content" data-role="content"></div>',

        setup: function(){
            // other options: content
            var defaults = {
                align: {pos: 'center'},
                classPrefix: 'egeui-dialog',
                closeTpl: 'x',
                title: '',
                zIndex: 999 + dialogCounter * 2,
                closeOnEscape: true
                // visible: true
            };
            var options = this.options = $.extend(defaults, this.options);

            this.$element = $(this._parseTpl(this._dialogTpl));
            if(options.closeTpl) $(this._parseTpl(this._closeTpl)).appendTo(this.$element).append(options.closeTpl);
            if(options.title) $(this._parseTpl(this._titleTpl)).appendTo(this.$element).append(options.title);

            if(options.content){
                this.$contentElement = $(this._parseTpl(this._contentTpl)).append(options.content);
                this.$element.append(this.$contentElement)
            } else {
                throw new Error('Dialog Error: content not specified');
            }
            if(options.actions) this.$element.append(options.actions);

            if(options.mask){
                var maskOptions = options.mask === true ? {
                    zIndex: options.zIndex - 1
                } : options.mask;
                this.mask = new Mask(maskOptions)

                this.before('show', function(){
                    this.mask.show();
                }).after('hide', function(){
                    this.mask.hide();
                }).after('destroy', function(){
                    this.mask.destroy();
                })
            }

            if(options.closeOnEscape){
                this.$element.attr( "tabIndex", -1);
                var escapeElements = [this.$element];
                if(options.mask) escapeElements.push(this.mask.$element);
                var self = this;
                $.each(escapeElements, function(){
                    this.keydown(function(ev){
                        // keyCode 27: Escpae
                        if(ev.which === 27) {
                            self.hide();
                        }
                    })
                })
            }

            Dialog.superClass.setup.call(this);

            // TODO when content is in document, keep element to origin parentNode before destroy
            this._isTemplate = true;
            dialogCounter++;
            this.after('show', function(){
                this.$element.focus();
            }).after('destroy', function(){
                dialogCounter--;
            })
        },
        events: {
            'click [data-role=close]': function(e){
                e.preventDefault();
                this.hide();
            }
        },
        _parseTpl: function(tpl){
            return tpl.replace(/\{\{classPrefix\}\}/g, this.options.classPrefix);
        }
    })

    var dialogCounter = 0;

    /* ConfirmBox WIDGET DEFINITION
     * ====================== */
    var ConfirmBox = Dialog.extend({

        _messageTpl: '<div class="{{classPrefix}}-message" data-role="message"></div>',
        _actionTpl: '<div class="{{classPrefix}}-action" data-role="action"></div>',

        setup: function() {
            var defaults = {
                message: '',
                classPrefix: 'egeui-confirmbox',
                confirmTpl: '<button class="pure-button button-primary confirm" data-role="confirm">确定</button>',
                cancelTpl: '<button class="pure-button cancel" data-role="cancel">取消</button>',
                mask: true,
                closeTpl: null,
                confirmOnEnter: true
            }
            var options = this.options = $.extend(defaults, this.options);
            this.options.content = $(this._parseTpl(this._messageTpl)).append(options.message);
            var actions = $(this._parseTpl(this._actionTpl));
            if(options.cancelTpl){
                actions.append(options.cancelTpl);
                if(options.cancelText) actions.find('[data-role=cancel]').text(options.cancelText);
            }
            if(options.confirmTpl) {
                actions.append(options.confirmTpl);
                if(options.confirmText) actions.find('[data-role=confirm]').text(options.confirmText);
            }
            if(!options.title){
                options.themeClass = 'no-title';
            }

            this.options.actions = actions;

            ConfirmBox.superClass.setup.call(this);

            this.render().show();

            if(options.confirmOnEnter){
                this.$element.keydown($.proxy(function(ev){
                    if(ev.which === 13){
                        this.$('[data-role=confirm]').trigger('click');
                    }
                }, this))
            }
        },
        events: {
            'click [data-role=confirm]': function (e) {
                if(this.options.onConfirm) this.options.onConfirm();
                this.destroy();
            },
            'click [data-role=cancel]': function(e){
                if(this.options.onCancel) this.options.onCancel();
                this.destroy();
            }
        }
    })



    /* DataSource CLASS DEFINITION
     * ====================== */
    var DataSource = Base.extend({
        constructor: function(options){
            this.source = options.source;
            this.filter = options.filter;
            this.locator = options.locator;
            this.valueField = options.valueField;
            this.init();
        },
        init: function(){
            if($.isArray(this.source)){
                this.type = 'array';
            } else if($.isFunction(this.source)){
                this.type = 'function';
            } else if ($.isPlainObject(this.source)) {
                if(this.source.data && this.source.fields){
                    this.type = 'array';
                    this.search_fields = this.source.fields;
                } else {
                    this.type = 'object';
                }
            } else if(isString(this.source)) {
                this.type = 'url';
            }
            if(this.type !== 'url'){
                this.filter = this.filter || 'startsWith';
                if(!$.isFunction(this.filter)){
                    this.filter = Filters[this.filter]
                    if(!this.filter){
                        throw new Error('DataSource Error: Specified filter is not existed.')
                    }
                }
                this._initDataSource()
            }

            this.id = 0;
            this.callbacks = [];
        },
        getData: function(query){
            this['_get' + capitalize(this.type) + 'Data'](query);
        },
        abort: function () {
            this.callbacks = [];
        },
        _done: function (data) {
            this.trigger('data', data);
        },
        _getArrayData: function(query){
            var data = this.filter(this.data, query);
            this._done(data)
            return data;
        },
        _getUrlData: function(query){
            var that = this,
                options = {cache: false};
            var obj = {
                query: query ? encodeURIComponent(query) : '',
                timestamp: new Date().getTime()
            };
            var url = this.source.replace(/\{\{(.*?)\}\}/g, function (all, match) {
                return obj[match];
            });

            var callbackId = 'callback_' + this.id++;
            this.callbacks.push(callbackId);

            if (/^(https?:\/\/)/.test(url)) {
                options.dataType = 'jsonp';
            } else {
                options.dataType = 'json';
            }
            $.ajax(url, options).success(function (data) {
                if(that.locator){
                    if($.isFunction(that.locator)){
                        data = that.locator(data, query);
                    } else {
                        data = data[that.locator];
                    }
                }
                if (data && $.inArray(callbackId, that.callbacks) > -1) {
                    delete that.callbacks[callbackId];
                    that._done(data);
                }
            }).error(function () {
                if ($.inArray(callbackId, that.callbacks) > -1) {
                    delete that.callbacks[callbackId];
                    that._done({});
                }
            });
        },
        _initDataSource: function(dataSource){
            if(this.type === 'array'){
                this.data = this.source;
                if(this.search_fields){
                    this.source = this.source.data;
                    var data = this.source;
                    var fields = this.search_fields;
                    var l = data.length;
                    this.data = [];
                    for (var i = 0; i < l ; i++) {
                        var item = {};
                        for(var f = 0; f < fields.length; f++){
                            item[fields[f]] = data[i][fields[f]]
                        }
                        this.data[i] = item;
                    }
                }
                normalizeData(this.data);
            }
        }
    })

    // 标准数据格式
    // {
    //     value: 'xxx' 或者 {'field1': {value: '123'}, 'field2': {value: 'xxx'}} 待匹配字段
    //     hlIndex: [start, end] 高亮范围  filter 后返回
    // }
    function normalizeData(data) {
        $.each(data, function (index, item) {
            if (isString(item)) {
                data[index] = {value: item};
            } else if ($.isPlainObject(item)) {
                for(var field in item){
                    if(item[field]){
                        item[field] = {
                            value: item[field]
                        }
                    }
                }
            }
        })
    }

    var Filters = {
        'startsWith': function(data, search){
            var re = new RegExp('^' + escapeKeyword(search), 'i');
            var result = [];
            var l = search.length;
            $.each(data, function(index, item){
                var new_item = {};
                var matched = false;
                for(var field in item){
                    if(!$.isPlainObject(item[field]) && field === 'value'){
                        new_item.value = item.value;
                        if(re.test(item.value)){
                            new_item.hlIndex = [0, l];
                            matched = true;
                        }
                    } else if($.isPlainObject(item[field])){
                        new_item[field] = {
                            value: item[field].value
                        };
                        if(re.test(item[field].value)){
                            new_item[field].hlIndex = [0, l];
                            matched = true;
                        }
                    }
                }
                if(matched){
                    new_item.index = index;
                    result.push(new_item);
                }
            })
            return result;
        },
        'stringMatch': function(data, search){
            var re = new RegExp(escapeKeyword(search), 'i');
            var result = [];
            var l = search.length, hl_start;
            $.each(data, function(index, item){
                var new_item = {};
                var matched = false;
                for(var field in item){
                    if(!$.isPlainObject(item[field]) && field === 'value'){
                        new_item.value = item.value;
                        hl_start = item.value.search(re);
                        if(hl_start > -1){
                            new_item.hlIndex = [hl_start, l];
                            matched = true;
                        }
                    } else if($.isPlainObject(item[field])){
                        new_item[field] = {
                            value: item[field].value
                        };
                        hl_start = item[field].value.search(re);
                        if(hl_start > -1){
                            new_item[field].hlIndex = [hl_start, l];
                            matched = true;
                        }
                    }
                }
                if(matched){
                    new_item.index = index;
                    result.push(new_item);
                }
            })
            return result;
        }
    }


    // Input widget start ==================== //
    function wrapFn(fn, context) {
        return function () {
            fn.apply(context, arguments);
        }
    }
    var lteIE9 = /\bMSIE [6789]\.0\b/.test(navigator.userAgent);
    // bind text change event
    function bindTextchange(element){
        if (lteIE9) {
            var elementValue = element.value;
            element.attachEvent("onpropertychange", function(ev){
                if (ev.propertyName !== "value") return;
                var value = ev.srcElement.value;
                if (value === elementValue) return;
                elementValue = value;
                $(element).trigger("textchange");
            });
            $(element).on("selectionchange keyup keydown", function() {
                if (element.value !== elementValue) {
                    elementValue = element.value;
                    $(element).trigger("textchange");
                }
            });
        } else {
            $(element).on("input", function(e) {
                // if (element.nodeName !== "TEXTAREA") {
                $(element).trigger("textchange");
                // }
            });
        }
    }
    var specialKeyCodeMap = {
        // 9: 'tab',
        27: 'esc',
        // 37: 'left',
        // 39: 'right',
        13: 'enter',
        38: 'up',
        40: 'down'
    };

    /* INPUT WIDGET DEFINITION
     * provide behave autocomplete trigger element
     * ====================== */
    var Input = Widget.extend({
        setup: function(){
            Input.superClass.setup.call(this);

            this.render();
            bindTextchange(this.element);
        },
        events: {
            'textchange': function(ev){
                var text = $(ev.target).val().replace(/^\s*/, '');
                if(this.options.delay){
                    this.delayTimer && clearTimeout(this.delayTimer);
                    this.delayTimer = setTimeout(wrapFn(function(){
                        this.trigger('change', text);
                        this.delayTimer = null;
                    }, this), this.options.delay)
                } else {
                    this.trigger('change', text)
                }
            },
            'keydown': function(ev){
                var keyName = specialKeyCodeMap[ev.which];
                if (keyName) {
                    var eventKey = 'key' + capitalize(keyName);
                    this.trigger(eventKey, keyName, ev)
                }
            },
            'blur': function(){
                this.trigger('blur');
            }
        }
    })

    /* AutoComplete WIDGET DEFINITION
     * ====================== */
    var AutoComplete = Overlay.extend({
        _selectTpl: '<div class="{{classPrefix}}"><ul data-role="items" class="item-list"></ul></div>',
        _itemWrapTpl: '<li class="{{classPrefix}}-item" data-role="item">{{item}}</li>',

        setup: function(){
            // other option: themeClass itemTpl
            var defaults = {
                align: {pos: 'bottom', collision: 'none'},
                classPrefix: 'egeui-select',
                selectTpl: this._selectTpl,
                itemSelectedClass: 'item-selected',
                selectFirst: false,
                submitOnEnter: false,
                changeOnSelect: true,
                delay: 200,
                showMenu: true
            };
            var options = this.options = $.extend(true, defaults, this.options);

            this.$element = $(this._parseTpl(options.selectTpl));
            // if(options.width){
            //     this.$element.css('width', options.width)
            // }
            this._itemWrapTpl = this._parseTpl(this._itemWrapTpl);
            if(options.align){
                options.align.elem = options.align.elem || options.trigger;
            }

            AutoComplete.superClass.setup.call(this);

            if(options.dataSource){
                this.dataSource =  new DataSource({
                    source: options.dataSource,
                    filter: options.filter,
                    locator: options.locator,
                    valueField: options.valueField
                });
            }

            if(options.inputAdapter){
                this.input = options.inputAdapter;
            } else {
                this.input = new Input({
                    element: options.trigger,
                    delay: options.delay
                });
            }

            this._bindInputEvents();
            this._bindEvents();
        },
        show: function(){
            if(this.visible) return;
            if(this._isEmpty() && !this.options.searchMoreTpl && !this.options.allowEmptyShow) return;
            AutoComplete.superClass.show.call(this);

            this.$element.scrollTop(0);
            // this._adjustMaxHeight();
        },
        reset: function(){
            if(lteIE9) this.silent = true;
            if(this.query !== ''){
                this.input.$element.val(this.query = '');
                this._clear();
            }
        },
        destroy: function(){
            this.dataSource = null;
            this.data = null;
            this.input.destroy();
            this._clear();
            AutoComplete.superClass.destroy.call(this);
        },

        query: '',
        lastIndex: -1,
        selectedIndex: -1,
        allowMouseMove: true,

        events: {
            'mouseenter [data-role=items] li': function(ev){
                if(!this.allowMouseMove){
                    this.allowMouseMove = true;
                    return;
                }
                this.lastIndex = this.selectedIndex;
                this.selectedIndex = this.items.index(ev.currentTarget);
                this.trigger('indexChange');
            },
            'mousedown [data-role=items] li': function(ev){
                if (lteIE9) {
                    var trigger = this.input.element;
                    trigger.onbeforedeactivate = function () {
                        window.event.returnValue = false;
                        trigger.onbeforedeactivate = null;
                    };
                }
                ev.preventDefault();
                this.trigger('itemSelected');
            },
            'mousedown': function(ev){
                if(!$(ev.target).closest("[data-role=items] [data-role=item]" ).length) {
                    this.cancelBlur = true;
                    var that = this;
                    setTimeout(function(){
                        delete that.cancelBlur;
                    }, 50)
                }
            }
        },

        queryData: function(query){
            if(!this.options.allowEmptyQuery && query === undefined && this.query === ''){
                this.data = [];
                this.hide();
                return;
            }
            this.dataSource.abort();
            this.dataSource.getData(query || this.query)
        },

        _bindInputEvents: function(){
            this.input.on('change', function(query){
                if(lteIE9 && this.silent){
                    this.silent = false;
                    return;
                }
                // TextComplete could search same query everytime
                if(!this.options.isTextComplete){
                    if(compare(this.query, query)) return;
                }
                this.query = query;
                this.queryData();
            }, this).on('blur', function(){
                if(this.cancelBlur) {
                    var $input = this.input.$element;
                    setTimeout(function(){
                        $input.focus()
                    }, 50);
                    return;
                }
                this.hide();
            }, this).on('keyDown keyUp', function(keyName, originEvent){
                if(this.options.isTextComplete && !this.visible) return;
                originEvent.preventDefault();
                this._handleKeyDownUp(keyName);
            }, this)
            .on('keyEnter', this._handleKeyEnter, this)
            .on('keyEsc', this.hide, this);
        },

        _bindEvents: function(){
            var options = this.options;

            if(this.dataSource){
                this.dataSource.on('data', function(data){
                    this.data = data;
                    this.trigger('response', data);
                    if(this.options.showMenu){
                        this._clear();
                        if(this.data.length){
                            this._fillItems();
                        } else {
                            this.hide();
                        }
                    }
                }, this);
            }

            this.after('hide', function(){
                if(this.items){
                    this.lastIndex = this.selectedIndex;
                    this.selectedIndex = -1;
                    this.trigger('indexChange');
                }
            });

            this.on('indexChange', this._handleItemHover)
            .on('itemSelected', function(){
                if(this.selectedIndex >= this.data.length){
                    this.hide();
                    this.trigger('searchMore');
                    return;
                }
                var selectedData = this.data[this.selectedIndex];
                if(this.dataSource.search_fields){
                    this.trigger('selected', this.dataSource.source[selectedData.index])
                } else {
                    if(this.options.changeOnSelect){
                        var val = selectedData[this.dataSource.valueField || 'value'] || selectedData;
                        if(lteIE9) this.silent = true;
                        this.input.$element.val(val);
                        this.query = val;
                    }
                    this.trigger('selected', selectedData.value || selectedData);
                }
                this.hide();
            });
        },

        _fillItems: function(){
            var items = '', that = this;
            $.each(this.data, wrapFn(function(index, item){
                item = this._renderItem(item);
                items += this._itemWrapTpl.replace('{{item}}', item)
            }, this))
            this.items = this.$('[data-role=items]').html(items).children();

            if(this.options.searchMoreTpl){
                var moreItem = $(this._itemWrapTpl.replace('{{item}}', this.options.searchMoreTpl(this.items)))
                .appendTo(this.$('[data-role=items]')).removeAttr('data-role').addClass('search-more');
                this.items.push(moreItem[0]);
            }
            if(this.options.selectFirst){
                this.selectedIndex = 0;
                this.trigger('indexChange');
            }
            this.show()
            this.trigger('itemsChange');
        },
        _renderItem: function (item){
            if(item.value && !$.isPlainObject(item.value)){
                return highlight(item.value, item.hlIndex);
            } else if(this.options.itemTpl) {
                return parseItem($.isFunction(this.options.itemTpl) ? this.options.itemTpl(item) : this.options.itemTpl, item, this.dataSource.source[item.index] || item)
            } else {
                return item;
            }
        },

        _handleKeyEnter: function(keyName, originEvent){
            if(this.items && this.items[this.selectedIndex]){
                !this.options.submitOnEnter && originEvent.preventDefault();
                this.trigger('itemSelected');
                originEvent.stopPropagation();
            }
        },
        _handleKeyDownUp: function(keyName, originEvent){

            if(!this.items) {
                if(this.options.allowEmptyQuery && this.query === ''){
                    this.queryData();
                }
                return;
            }

            this.show();
            this.allowMouseMove = false;

            this.lastIndex = this.selectedIndex;

            if(keyName === 'down'){
                this.selectedIndex++;
            } else {
                this.selectedIndex--;
            }
            if(this.selectedIndex === this.items.length){
                this.selectedIndex = -1;
            }
            if(this.selectedIndex === -2){
                this.selectedIndex = this.items.length - 1;
            }
            this.trigger('indexChange');

            var row =  $(this.items[this.selectedIndex]);
            if(!row[0]) return;
            var rowTop = row.offset().top - row.parent().offset().top;
            var scrollElement = this.$('[data-role="items"]');
            // TODO: add 18 is a hack sometimes have horizontal scrollbar, not good
            var delta = rowTop + row.outerHeight() - scrollElement.outerHeight() + 18;
            if(delta > 0) {
                scrollElement.scrollTop(delta + scrollElement.scrollTop())
            } else if(rowTop < 0){
                scrollElement.scrollTop(Math.max(0, scrollElement.scrollTop() + rowTop));
            }
        },

        _adjustMaxHeight: function(){
            var maxTop = $(window).height() + $(window).scrollTop() - this.$element.outerHeight();
            var top = parseInt(this.$element.css('top'), 10);
            this.$element.css('max-height', top > maxTop ? (Math.max(0, maxTop - top + this.$element.innerHeight()) + 'px') : '');
            this.trigger('maxHeightChange');
        },
        _handleItemHover: function(){
            $(this.items[this.lastIndex]).removeClass(this.options.itemSelectedClass);
            $(this.items[this.selectedIndex]).addClass(this.options.itemSelectedClass);
        },
        _isEmpty: function() {
            var data = this.data;
            return !(data && data.length > 0);
        },
        _clear: function () {
            this.$('[data-role=items]').empty();
            delete this.items;
            this.selectedIndex = -1;
        },
        _parseTpl: function(tpl){
            return tpl.replace(/\{\{classPrefix\}\}/g, this.options.classPrefix);
        }
    })
    function parseItem(tpl, data, sourceData){
        var re = /(.*?)\{\{([\w\-]+)\}\}(.*?)/g;
        return tpl.replace(re, function(match, p1, p2, p3){
            return  p1 + (data[p2] && data[p2].hlIndex ? highlight(data[p2].value, data[p2].hlIndex) : sourceData[p2]) + p3;
        })
    }
    function highlight(text, hlIndex){
        if(!hlIndex) return text;
        var l = text.length;
        return text.substr(0, hlIndex[0]) + '<b>' +
               text.substr(hlIndex[0], hlIndex[1]) + '</b>' +
               text.substr(hlIndex[0] + hlIndex[1], l);
    }

    function escapeKeyword (str){
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }
    function compare(a, b) {
        a = (a || '').replace(/^\s*/g, '').replace(/\s{2,}/g, ' ');
        b = (b || '').replace(/^\s*/g, '').replace(/\s{2,}/g, ' ');
        return a === b;
    }
    function capitalize(str) {
        return str.replace(/^([a-z])/, function (f, m) {
            return m.toUpperCase();
        });
    }
    function isString(str) {
        return Object.prototype.toString.call(str) === '[object String]';
    }


    /* Contacts WIDGET DEFINITION
     * ====================== */
    var ContactSelect = Widget.extend({
        setup: function(defaults){
            defaults = $.extend({
                idField: 'id',
                inputTpl: '<input type="text" autocomplete="off">',
                contactTpl: '<span>{{name}}</span>',
                removeTpl: '<i data-role="remove" title="删除" class="icon icon-pill-remove"></i>',
                itemTpl: function(item){
                    return [
                        '<i class="icon icon-collab-',
                        item.user_count ? 'group' : 'person',
                        '"></i><span class="name">{{name}}</span><span>({{',
                        item.user_count ? 'user_count' : 'login',
                        '}})</span>'
                    ].join('');
                },
                selectTpl: '<div class="{{classPrefix}}"><ul data-role="items" class="item-list"></ul></div>',
                inputMinWidth: 60,
                showOnClick: true,
                delay: 400,
                multiple: true,
                insertBack: true
            }, defaults);

            var options = this.options = $.extend(defaults, this.options);
            if(!options.contactTpl){
                throw new Error('ContactSelect Error: contactTpl not specified');
            }

            ContactSelect.superClass.setup.call(this);

            this.input = $(options.inputTpl).appendTo(this.element).css('border', 'none');
            this.items = [];
            this.contacts = [];

            this.adjustInputWidth();

            var that = this;
            this.selector = new AutoComplete({
                trigger: this.input,
                selectFirst: options.selectFirst,
                dataSource: options.data,
                filter: options.filter,
                locator: options.locator,
                selectTpl: options.selectTpl,
                itemTpl: options.itemTpl,
                changeOnSelect: false,
                allowEmptyQuery: options.showOnClick,
                allowEmptyShow: options.showOnClick,
                delay: options.delay,
                zIndex: 9999,
                align: {
                    elem: options.alignElement || this.$element,
                    offset: options.alignOffset || '-1 0',
                    after: 'show'
                },
                themeClass: 'contact-select',
                width: $$(options.alignElement)[0] && $$(options.alignElement).innerWidth()
            }).on('selected', function(data){
                if(!that.multiSelected){
                    if(this.query !== ''){
                        this.reset();
                    }
                } else {
                    that.multiSelected = false;
                }
                if(options.insertBack){
                    that.insertItem(data);
                }
                that.trigger('add', data);
            })

            if(this.$element.attr('placeholder')) this.input.attr('placeholder', this.$element.attr('placeholder'));

            this.render();
        },
        events: {
            "click input": function(){
                if(this.options.showOnClick){
                    if(this.selector.items){
                        this.selector.show()
                    } else {
                        this.selector.queryData('');
                    }
                }
            },
            "keydown input": function(ev){
                if(ev.which === 8 && ev.target.value === '' && this.items.length){
                    this.removeItem(this.items.length - 1)
                }
            },
            "click [data-role='remove']": "removeItem"
        },
        destroy: function(){
            this.selector.destroy();
            this.input.remove();
            delete this.items;
            delete this.contacts;
            ContactSelect.superClass.destroy.call(this);
        },
        'insertItem': function(data){
            for (var i = this.contacts.length - 1; i >= 0; i--) {
                if(this.contacts[i][this.options.idField] == data[this.options.idField]){
                    return;
                }
            }

            var re = /(.*?)\{\{([\w\-]+)\}\}(.*?)/g;
            var contactTpl = this.options.contactTpl;
            if($.isFunction(contactTpl)){
                contactTpl = contactTpl(data);
            }
            contactTpl = contactTpl.replace(re, function(match, p1, p2, p3){
                return  p1 + data[p2] + p3;
            })
            var insertItem = $(contactTpl).insertBefore(this.input);
            if(this.options.removeTpl){
                $(this.options.removeTpl).appendTo(insertItem);
            }
            this.items.push(insertItem[0]);
            if(this.options.multiple) {
                this.adjustInputWidth();
            } else {
                this.input.hide();
            }
            this.contacts.push(data);
        },
        'removeItem': function(e){
            var index, item;
            if($.isNumeric(e)){
                index = e;
                item = this.items[index];
            } else {
                e.stopPropagation();
                item = $(e.target).parent()[0];
                index = this.items.indexOf(item);
            }
            var contact = this.contacts[index];
            this.items.splice(index, 1);
            this.contacts.splice(index, 1);
            $(item).remove();
            if(!this.options.multiple){
                this.input.show();
            }
            this.adjustInputWidth();
            this.trigger('remove', index, contact);
        },
        'adjustInputWidth': function(){
            var wrapWidth = this.$element.width() - 12;
            var inputWidth = wrapWidth;
            if(this.items.length){
                var item = $(this.items.slice(-1)[0]);
                inputWidth = wrapWidth - item.offset().left + this.$element.offset().left - item.outerWidth();
                if(inputWidth < this.options.inputMinWidth){
                    inputWidth = wrapWidth;
                }
            }
            this.input.css('width', inputWidth)
        },
        'clear': function(){
            $(this.items).remove();
            this.items = [];
            this.contacts = [];
        }
    })


    /* Tree WIDGET DEFINITION
     * ====================== */
    var Tree = Widget.extend({
        _nodeListTpl: '<ul class="node-list" data-role="nodes"></ul>',
        _nodeWrapTpl: '<li class="node" data-role="node"><div class="item" data-role="item"></div></li>',
        _switchTpl: '<i class="tree-switcher icon icon-tree-{{switch_class}}" data-role="switcher"></i>',
        _checkboxTpl: '<i class="{{checkbox_class}}" data-role="checkbox"></i>',
        _nodeIconTpl: '<i class="{{icon_class}}" data-role="node-icon"></i>',
        _defaultField: ['open', 'checkboxDisabled', 'checked', 'isParent', 'async', 'halfCheck'],
        setup: function(){
            var defaults = {
                nodeTpl: '<span class="name" data-role="name">{{name}}</span>',
                childField: 'children',
                nodeFields: [],
                idField: 'id',
                classPrefix: 'egeui-tree',
                idPrefix: 'etn',
                expandDepth: 0,
                dataLocator: null,
                isLeafField: null,
                isOpenField: null,
                isDisabledField: null,
                async: {
                    enable: true,
                    type: 'get',
                    dataType: 'json',
                    contentType: "application/x-www-form-urlencoded",
                    url: '',
                    param : ["id=fid"],
                    dataFilter: null
                },
                //TODO keep leaf & keep parent
                keep: {
                    leaf: false,
                    parent: true
                },
                iconClass: {
                    default: '',
                    open: 'open',
                    close: 'close',
                    loading: 'loading',
                    leaf: 'doc'
                },
                callback: {
                    beforeAsync: null
                }
            };

            var options = this.options = $.extend(true, defaults, this.options);

            if(!options.nodeTpl){
                throw new Error('Tree Error: nodeTpl not specified');
            }
            if(!options.data){
                throw new Error('Tree Error: data not specified');
            }

            Tree.superClass.setup.call(this);

            this.render();
        },
        render: function(){
            Tree.superClass.render.call(this);
            this.$element.addClass(this.options.classPrefix);
            var data = this._normalizeData(this.options.data);
            this._renderNodes(data, 1, this.$element);
        },

        reDraw: function(data){
            this.$element.empty();
            data = this._normalizeData(data);
            this._renderNodes(data, 1, this.$element);
        },
        events: {
            'click [data-role="switcher"]': function(ev){
                ev.stopPropagation();
                var $node = $(ev.target).parent().parent();
                var node = $(ev.target).parent().data('nodeData');
                this.switchNode(node);
            },
            'click [data-role="item"]': function(ev){
                this._selectNode($(ev.currentTarget));
                this.trigger('nodeClick', this.getSelectedNode());
            },
            'mouseenter [data-role="item"]': function(ev){
                var $node = $(ev.currentTarget);
                this.trigger('nodeEnter', $node);
            },
            'mouseleave [data-role="item"]': function(ev){
                var $node = $(ev.currentTarget);
                this.trigger('nodeLeave', $node);
            },
            'click [data-role="checkbox"]': function(ev){
                ev.stopPropagation();
                var node = $(ev.target).parent().data('nodeData');
                //this._checkNode($(ev.target).parent())
                this.checkNode(node);

            }
        },

        getSelectedNode: function(){
            return this.$('.node .highlight').data('nodeData');
        },

        findNodeById: function(id){
            return this.$('#' + this.options.idPrefix + id).data('nodeData');
        },

        getCheckedNodes: function(){
            return $.map(this.$('i[data-role="checkbox"].checked'), function(node){
                return $(node).parent().data('nodeData');
            })
        },

        checkNode: function(node, checked, silent, inheritParent, inheritSon){
            if (node.checkboxDisabled) return;
            var id = this._getNodeId(node);
            this._checkNode(this.$('#' + this.options.idPrefix + id), checked, silent);
            if (inheritParent){
                this.checkParentNode(node);
            }
            if (inheritSon){
                this.checkSonNode(node);
            }
        },

        checkAllNodes: function(checked, silent){
            var self = this;
            this.$('[data-role="item"]').each(function(){
                self._checkNode($(this), checked, silent)
            })
        },

        selectNode: function(node, silent){
            var id = this._getNodeId(node);
            this._selectNode(this.$('#' + this.options.idPrefix + id), silent);
        },

        setNode: function(node, attributes){
            var id = this._getNodeId(node);
            var $node = this.$('#' + this.options.idPrefix + id);
            var nodeData = $node.data('nodeData');
            $.each(attributes, function(attr, val){
                nodeData[attr] = val;
                $node.find('[data-role=' + attr + ']').text(val);
            })
            $node.data('nodeData', nodeData);
        },

        addNode: function(data, parentNode, isSilent){
            var $node = this.$('#' + this.options.idPrefix + this._getNodeId(parentNode));
            parentNode = $node.data('nodeData');
            if(!$node[0]) return;
            var depth = $node.data('level') + 1;

            $parentNode = $node.parent();

            var data = this._normalizeData(data);
            parentNode[this.options.childField] = $.isArray(parentNode[this.options.childField]) ? parentNode[this.options.childField].concat(data) : data;
            parentNode[this.options.childField].length > 0 && (parentNode.isParent = true);
            this._renderNodes(data, depth, $parentNode);
            if (!isSilent){
                this._expandParent($parentNode);
                //set open style
                var ico = this.getNodeIco(parentNode);
                ico.attr('class', this._makeNodeIcoClass(parentNode));
            }
        },

        hideNode: function(node){
            var $treeNode = this._getTreeNode(node);
            if ($treeNode !== false){
                $treeNode.hide();
                node.isHidden = true;
            }
        },

        showNode: function(node){
            var $treeNode = this._getTreeNode(node);
            if ($treeNode !== false){
                $treeNode.show();
                node.isHidden = false;
            }
        },

        _getTreeNode: function(node){
            if (!node) return false;
            return this.$('#' + this.options.idPrefix + this._getNodeId(node)).parent();
        },

        removeNode: function(node){
            var $treeNode = this._getTreeNode(node);
            if($treeNode === false || !$treeNode[0]) return;

            if (!this.options.keep.parent){
                if(!$treeNode.siblings().length){
                    $treeNode.parent().prev('[data-role="item"]').prepend('<b class="leaf"></b>')
                    .find('[data-role="switcher"]').remove();
                }
            }
            $treeNode.remove();
        },

        expandNode: function(node){
            var id = this._getNodeId(node);
            var $node = this.$('#' + this.options.idPrefix + id).parent();
            if(!$node[0]) return;
            node = this.$('#' + this.options.idPrefix + id).data('nodeData');
            if (!this.canAsync(node)){

                this._toggleNode($node, 'expand');
                var self = this;
                $.each($node.parents('[data-role="node"]'), function(){
                    self._toggleNode($(this), 'expand');
                })

            } else if (this.options.async.enable){
                this.asyncNode(node);
            }

        },

        _getNodeId: function(node){
            var id = node;
            if($.isPlainObject(node)){
                id = node[this.options.idField];
            }
            return id;
        },

        _checkNode: function($node, checked, silent){
            var checkbox = $node.find('[data-role="checkbox"]'),
                node = $node.data('nodeData');
            if (checked !== undefined && node.checked === checked){
                return;
            }
            if (checked === undefined){
                node.checked = !node.checked;
            }else{
                node.checked = checked;
            }

            if (node.checked){
                if(!silent) this.trigger('checked', $node.data('nodeData'));
            } else {
                if(!silent) this.trigger('unChecked', $node.data('nodeData'));
            }
            node.halfCheck = false;
            checkbox.attr('class', this._makeCheckboxClass(node));
            if(!silent) this.trigger('afterCheck', $node.data('nodeData'));
        },
        _selectNode: function($node, silent){ 
            this.$('.highlight').removeClass('highlight');
            $node.addClass('highlight');
            if(!silent){
                this.trigger('nodeSelected', $node.data('nodeData'));
            }
        },

        _toggleNode: function($node, switcher){
            var toggle_old = 'collapse', toggle_new = 'expand';
            if($node.hasClass('expand')){
                toggle_old = 'expand', toggle_new = 'collapse';
            }
            if(switcher && switcher === toggle_old) return;
            $node.removeClass(toggle_old).addClass(toggle_new)
                .children('[data-role="item"]').find('.tree-switcher').removeClass('icon-tree-' + toggle_old)
                .addClass('icon-tree-' + toggle_new);

            var nodeData = $node.children('[data-role="item"]').data('nodeData');
            nodeData.open = !nodeData.open;  //change open state where toggle class

        },

        _expandParent: function($node){
            var $item = $node.children('[data-role="item"]');
            if(!$item.find('[data-role="switcher"]')[0]){
                $item.find('.leaf').remove();
                var switch_el = this._switchTpl.replace('{{switch_class}}', 'expand');
                if($item.find('b')[0]){
                    $item.find('b:last').after(switch_el)
                } else {
                    $item.prepend(switch_el)
                }
            }
            this._toggleNode($node, 'expand')
        },

        _normalizeData: function(data){
            if(!$.isArray(data)){
                if(data[this.options.childField] === undefined){
                    data[this.options.childField] = [];
                }
                data = [data];
            }
            return data;
        },

        _renderNodes: function(nodes, depth, $parentNode){
            var $nodeList = this._getNodeList($parentNode);
            if (!$nodeList[0]){
                $nodeList = $(this._nodeListTpl).appendTo($parentNode)
            }
            var checkbox_el = this.options.checkbox ? this._checkboxTpl : '';

            var nodeTpl = this.options.nodeTpl,
                    that = this;
                      re = /\{\{([\w\-]+)\}\}/g;
            $.map(nodes, function(nodeData){
                nodeData = that._initNode(nodeData, depth);
                var node_el = nodeTpl.replace(re, function(match, p1){
                    return nodeData[p1];
                })
                var switcher = nodeData.open ? 'expand' : 'collapse';

                var $node = $(that._nodeWrapTpl).appendTo($nodeList).addClass(switcher);
                var $item = $node.children().append(Array(depth).join('<b></b>')).attr('data-level', depth);

                if(nodeData.isParent){
                    $item.append(that._switchTpl.replace('{{switch_class}}', switcher));
                } else {
                    $item.prepend('<b class="leaf"></b>');
                }

                $item.append(checkbox_el.replace('{{checkbox_class}}', that._makeCheckboxClass(nodeData)) + that._nodeIconTpl.replace('{{icon_class}}', that._makeNodeIcoClass(nodeData)) + node_el);
                that._bindNodeData($item, nodeData);

                if(nodeData[that.options.childField] && nodeData[that.options.childField].length > 0){
                    that._renderNodes(nodeData[that.options.childField], depth + 1, $node);
                }
                that.trigger('renderNode', nodeData);
            });
            that.trigger('renderEnd', nodes);
        },
        _bindNodeData: function($node, data){
            if(this.options.dataProcess){
                data = this.options.dataProcess(data);
            }
            var nodeData = {};
            if(this.options.nodeFields.length){
                this.options.nodeFields = this.options.nodeFields.concat(this._defaultField);
                $.map(this.options.nodeFields, function(field){
                    nodeData[field] = data[field];
                })
            } else {
                nodeData = data;
            }
            if(this.options.idField){
                $node.attr('id',this.options.idPrefix + data[this.options.idField]);
            }

            $node.data('nodeData', nodeData);
        },
        _getNodeList: function($node){
            return $node.children('[data-role="nodes"]');
        },
        _getCheckbox: function(node){
            return this.$('#' + this.options.idPrefix + this._getNodeId(node)).find('[data-role="checkbox"]');
        },
        checkNodeInherit: function($node, checked, silent, inherit){

        },
        checkSonNode: function(node, checked){
            if (!node || !node.isParent) return;
            var childKey = this.options.childField;
            if (checked == undefined){checked = node.checked}
            if (!node[childKey]) return;
            for (var i = 0, l = node[childKey].length; i < l; i++){
                var childNode = node[childKey][i];
                childNode.checked = checked;
                childNode.halfCheck = false;

                this._getCheckbox(childNode).attr('class', this._makeCheckboxClass(childNode));
                this.checkSonNode(childNode, checked);
            }
        },
        checkParentNode: function(node, checked){
            if (!node) return;
            var $parentNode = this.getParentNode(node);
            if (!$parentNode[0]) return;

            var parentNode = $parentNode.data('nodeData'),
                parentCheck,parentHalfCheck = false;

            if (!node.halfCheck){
                var siblings = $('#' + this.options.idPrefix + this._getNodeId(node)).parent().siblings(),
                    andState = orState = node.checked;

                for (var i = 0, l = siblings.length; i < l; i++){
                    var nodeData = $(siblings[i]).find('[data-role="item"]').data('nodeData');
                    andState = andState && nodeData.checked;
                    orState = orState || nodeData.checked;
                    if ((andState == false && orState == true) || !!nodeData.halfCheck){
                        parentHalfCheck = true;
                        break;
                    }
                }
            } else {
                parentHalfCheck = true;
            }
            if (parentHalfCheck == true){
                parentNode.checked = true;
                parentNode.halfCheck = true;
            }else if (orState == false){
                parentNode.checked = false;
                parentNode.halfCheck = false;
            }else if (andState == true){
                parentNode.checked = true;
                parentNode.halfCheck = false;
            }
            //set checkbox class
            $parentNode.find('[data-role="checkbox"]').attr('class', this._makeCheckboxClass(parentNode));
            this.checkParentNode(parentNode, checked);
        },
        setCheckboxDisabled: function(node, disabled, inheritParent, inheritSon){
            if (!node) return;
            node.checkboxDisabled = disabled == undefined ? !node.checkboxDisabled : disabled;
            this._getCheckbox(node).attr('class', this._makeCheckboxClass(node));
            if (inheritParent) {
                this.setParentDisabled(node, disabled, true);
            }
            if (inheritSon) {
                this.setSonDisabled(node, disabled, true);
            }

        },
        setParentDisabled: function(node, disabled, inherit){
            if (!node) return;

            if (inherit){
                var parentNode = this.getParentNode(node).data('nodeData');
                if (!parentNode) return;
                if (parentNode.checkboxDisabled != disabled){
                    parentNode.checkboxDisabled = disabled;
                }
                this._getCheckbox(parentNode).attr('class', this._makeCheckboxClass(parentNode));
                this.setParentDisabled(parentNode, disabled, inherit);

            }

        },
        setSonDisabled: function(node, disabled, inherit){
            if (!node) return;
            var childKey = this.options.childField;

            if (node[childKey] && inherit) {
                for (var i = 0, l = node[childKey].length; i < l; i++) {
                    var sonNode = node[childKey][i];
                    if (sonNode.checkboxDisabled != disabled) {
                        sonNode.checkboxDisabled = disabled;
                    }
                    this._getCheckbox(sonNode).attr('class', this._makeCheckboxClass(sonNode));
                    this.setSonDisabled(sonNode, disabled, inherit);
                }
            }
        },
        getNodes: function(){
            var rootElement = this.$element.find('[data-level="1"]'),nodes = [];

            for (var i = 0, l = rootElement.length; i < l; i++){
                nodes.push($(rootElement[i]).data('nodeData'));
            }
            return nodes;
        },
        // checkState: full_true, full_false, part
        _makeCheckboxClass: function(node){
            var classPrefix = 'checked',
                checkboxClass = ['icon', 'icon-checkbox'];

            if (!!node.halfCheck){
                checkboxClass.push(classPrefix + '_part');
            } else {
                if (!!node.checked){
                    checkboxClass.push(classPrefix);
                }
                /*else {
                    checkboxClass.push(classPrefix + 'full_false');
                }*/
            }
            if (!!node.checkboxDisabled){
                checkboxClass.push('disabled');
            }
            return checkboxClass.join(' ');

        },
        _makeNodeIcoClass: function(node){
            var icoClass = ['ico'], nodeIconClass = this.options.iconClass;
            if (!node.isAjaxing) {
                icoClass[0] = (node.iconSkin ? node.iconSkin + '_' : '') + icoClass[0];
                if (node.isParent){
                    icoClass.push(node.open ? nodeIconClass.open : nodeIconClass.close);
                } else {
                    icoClass.push(nodeIconClass.leaf);
                }
            }

            return nodeIconClass.default + ' ' + icoClass.join('_');
        },
        getNodeIco: function(node){
            return $('#' + this.options.idPrefix + node[this.options.idField]).children('[data-role="node-icon"]');
        },
        getParentNode: function(node){
            var id = this._getNodeId(node);
            var $node = this.$('#' + this.options.idPrefix + id).parent();
            return $node.parent().prev('[data-role="item"]');
        },
        asyncNode: function(node, isSilent, callback){
            if (node && !node.isParent) {
                //callback
                return false;
            }else if (node && node.isAjaxing){
                return false;
            }

            if (typeof this.options.callback.beforeAsync == 'function'){
                if (this.options.callback.beforeAsync.apply(this,node) === false) return false;
            }
            if (node){
                node.isAjaxing = true;
            }
            var param = {},
                that = this;
                options = this.options;

            //get params of node
            for (var i = 0, l = options.async.param.length; i < l; i++){
                var pKey = options.async.param[i].split("="), spKey = pKey;
                if (pKey.length > 1){
                    spKey = pKey[1];
                    pKey = pKey[0];
                }
                param[spKey] = node[pKey] || '';
            }

            //set loading class
            var ico;
            setTimeout(function(){
                ico = that.getNodeIco(node);
                ico.attr({'class': options.iconClass.default + ' ' + options.iconClass.loading});
            },0)

            $.ajax({
                contentType: options.async.contentType,
                cache: options.async.cache === undefined,
                type: options.async.type,
                dataType: options.async.dataType,
                data: param,
                url: options.async.url,
                error: function(){
                    that.trigger('asyncError');
                    node && (node.isAjaxing = null);
                    ico.attr('class', that._makeNodeIcoClass(node));
                    //reset loading style
                },
                success: function(data){
                    if (node) {
                        node.isAjaxing = null;
                        node.async = true;
                    }
                    if(!!that.options.dataLocator){
                        data = that._call(that.options.dataLocator, data);
                    }
                    that.addNode(data, node, !!isSilent);
                    //reset loading style
                    ico.attr('class', that._makeNodeIcoClass(node));
                    that.trigger('asyncSuccess',node);
                    //callback
                }
            })
            return true;
        },
        reAsyncChildNodes:function(nodeId, reloadType, isSilent){
            if (!this.options.async.enable) return;
            var node = this.findNodeById(nodeId);

            if (!node) return;

            if (reloadType == 'refresh'){
                var childField = this.options.childField;
                this.removeChildNodes(node);
            }
            this.asyncNode(node, !!isSilent)
        },
        canAsync: function(node){
            var options = this.options;
            return options.async.enable && node && node.isParent && !(node.async || (node[options.childField] && node[options.childField].length > 0));
        },
        switchNode: function(node){
            if (node.open || !this.canAsync(node)){
                this.expandCollapseNode(node, node.open);
            } else if (this.options.async.enable){
                this.asyncNode(node);
            } else if (node){
                this.expandCollapseNode(node, node.open);
            }
        },
        expandCollapseNode: function(node, openflag){
            var childKey = this.options.childField,
                that = this;
            if (!node) return;

            if (node.isParent){
                var $node = $('#' + this.options.idPrefix + that._getNodeId(node))
                that._toggleNode($node.parent(), !!openflag ? 'collapse' : 'expand');

                //toggle folder style
                var ico = that.getNodeIco(node);
                ico.attr('class', that._makeNodeIcoClass(node));
            }
        },
        removeChildNodes: function(node){
            if (!node) return;
            this.expandCollapseNode(node, true);
            var childKey = this.options.childField;
            nodes = node[childKey];
            if (!nodes) return;
            for (var i = 0, l = nodes.length; i < l; i++){
                this.removeNode(nodes[i]);
            }
            node[childKey] = [];
            //TODO:check keep parent
        },
        _call: function(fun, param){
            return $.isFunction(fun) ? fun.call(this, param ? param : []) : (typeof fun == 'string' ? (param ? param[fun] : false) : false);
        },
        _initNode: function(node, depth){
            var depth = depth || 1;

            if (!!this.options.isOpenField){
                node.open = this._call(this.options.isOpenField, node);
            } else {
                node.open = node.open === undefined ? (this.options.expandDepth === 0 || depth < this.options.expandDepth ? true : false) : node.open;
            }

            if (node[this.options.childField] && node[this.options.childField].length > 0){
                node.isParent = true;
                node.async = true;
            } else if (!!this.options.isLeafField) {
                node.isParent = !this._call(this.options.isLeafField, node);
                node.async = !node.isParent;
            } else {
                node.isParent = (typeof node.isParent == 'string') ? node.isParent === 'true' : !!node.isParent;
                node.async = !node.isParent;
            }

            //check state
            if (!!this.options.checkbox){
                node.checked = !!node.checked;
                node.halfCheck = !!node.halfCheck;
                node.checkboxDisabled = !!node.checkboxDisabled;
                if (!!this.options.isDisabledField){
                    node.checkboxDisabled = this._call(this.options.isDisabledField, node);
                } else {
                    node.checkboxDisabled = !!node.checkboxDisabled;
                }
            }
            return node;
        },
        destroy: function(){
            delete this.options;
            this.$element.empty();
            Tree.superClass.destroy.call(this);
        }
    })

    // TextComplete Widget ============================================ //
    var TextCompleteAdapter = {};
    (function(){
        // TextComplete Adapter. Thanks jQuery.textcomplete
        // Inherit from Input widget
        var Adapter = Input.extend({

            setup: function(){
                Input.superClass.setup.call(this);
                // bind keyup events on element
                this.options.events =  {
                    'keyup': function(ev){
                        if(this.options.delay && ev.which !== 8){
                            this.delayTimer && clearTimeout(this.delayTimer);
                            this.delayTimer = setTimeout(wrapFn(function(){
                                this._keyUp(ev);
                                this.delayTimer = null;
                            }, this), this.options.delay)
                        } else {
                            this._keyUp(ev);
                        }
                    }
                }
                this.render();
            },

            select: function (/* value, strategy */) {
                throw new Error('Not implemented');
            },

            destroy: function () {
                this.$element.off('.' + this.cid);
                Adapter.superClass.destroy.call(this);
            },
            // Returns the caret's relative coordinates from body's left top corner.
            // FIXME: Calculate the left top corner of `this.option.appendTo` element.
            getCaretPosition: function () {
                var position = this._getCaretRelativePosition();
                var offset = this.$element.offset();
                position.top += offset.top;
                position.left += offset.left;
                position.collision = 'fit';
                return position;
            },
            focus: function () {
                this.$element.focus();
            },

            _keyUp: function(e){
                if (this._skipSearch(e)) return;
                this.trigger('search', this.getTextFromHeadToCaret());
            },
            // Suppress searching if it returns true.
            _skipSearch: function (ev) {
                switch (ev.keyCode) {
                    case 40: // DOWN
                    case 38: // UP
                    return true;
                }
                if (ev.ctrlKey) {
                    switch (ev.keyCode) {
                        case 78: // Ctrl-N
                        case 80: // Ctrl-P
                        return true;
                    }
                }
            },
        })

        var Textarea = Adapter.extend({
            // Update the textarea with the given value and strategy.
            select: function (value, strategy) {
                var pre = this.getTextFromHeadToCaret();
                var post = this.element.value.substring(this.element.selectionEnd);
                var newSubstr = strategy.replace(value);
                if ($.isArray(newSubstr)) {
                    post = newSubstr[1] + post;
                    newSubstr = newSubstr[0];
                }
                pre = pre.replace(strategy.match, newSubstr);
                this.$element.val(pre + post);
                this.element.selectionStart = this.element.selectionEnd = pre.length;
            },

            // Private methods
            // ---------------

            // Returns the caret's relative coordinates from textarea's left top corner.
            //
            // Browser native API does not provide the way to know the position of
            // caret in pixels, so that here we use a kind of hack to accomplish
            // the aim. First of all it puts a dummy div element and completely copies
            // the textarea's style to the element, then it inserts the text and a
            // span element into the textarea.
            // Consequently, the span element's position is the thing what we want.
            _getCaretRelativePosition: function () {
                var text = this.getTextFromHeadToCaret();
                // TODO: fix IETextarea quirks wrap space when line break
                if(typeof this.element.selectionEnd !== 'number'){
                    text = text.replace(/\n/g, '');
                }
                var dummyDiv = $('<div></div>').css(this._copyCss())
                    .text(text);
                var span = $('<span></span>').text('.').appendTo(dummyDiv);
                this.$element.before(dummyDiv);
                var position = span.position();
                position.top += span.height() - this.$element.scrollTop();
                position.lineHeight = span.height();
                dummyDiv.remove();
                return position;
            },

            _copyCss: function () {
                return $.extend({
                    // Set 'scroll' if a scrollbar is being shown; otherwise 'auto'.
                    overflow: this.element.scrollHeight > this.element.offsetHeight ? 'scroll' : 'auto'
                }, Textarea.DIV_PROPERTIES, this._getStyles());
            },

            _getStyles: (function ($) {
              var color = $('<div></div>').css(['color']).color;
              if (typeof color !== 'undefined') {
                    return function () {
                      return this.$element.css(Textarea.COPY_PROPERTIES);
                    };
              } else { // jQuery < 1.8
                    return function () {
                        var $el = this.$element;
                        var styles = {};
                        $.each(Textarea.COPY_PROPERTIES, function (i, property) {
                            styles[property] = $el.css(property);
                        });
                        return styles;
                    };
              }
            })($),

            getTextFromHeadToCaret: function () {
                return this.element.value.substring(0, this.element.selectionEnd);
            }
        })

        Textarea.DIV_PROPERTIES = {
            left: -9999,
            position: 'absolute',
            top: 0,
            whiteSpace: 'pre-wrap'
        }

        Textarea.COPY_PROPERTIES = [
            'border-width', 'font-family', 'font-size', 'font-style', 'font-variant',
            'font-weight', 'height', 'letter-spacing', 'word-spacing', 'line-height',
            'text-decoration', 'text-align', 'width', 'padding-top', 'padding-right',
            'padding-bottom', 'padding-left', 'margin-top', 'margin-right',
            'margin-bottom', 'margin-left', 'border-style', 'box-sizing', 'tab-size'
        ];

        TextCompleteAdapter['Textarea'] = Textarea;

        // IETextarea adapter
        var sentinelChar = '吶';
        var IETextarea = Textarea.extend({

            setup: function(){
                IETextarea.superClass.setup.call(this);
                $('<span>' + sentinelChar + '</span>').css({
                    position: 'absolute',
                    top: -9999,
                    left: -9999
                }).insertBefore(this.element);
            },

            select: function (value, strategy) {
                var pre = this.getTextFromHeadToCaret();
                var post = this.element.value.substring(pre.length);
                var newSubstr = strategy.replace(value);
                if ($.isArray(newSubstr)) {
                    post = newSubstr[1] + post;
                    newSubstr = newSubstr[0];
                }
                pre = pre.replace(strategy.match, newSubstr);
                this.$element.val(pre + post);
                this.element.focus();
                var range = this.element.createTextRange();
                range.collapse(true);
                range.moveEnd('character', pre.length);
                range.moveStart('character', pre.length);
                range.select();
            },

            getTextFromHeadToCaret: function () {
                this.element.focus();
                var range = document.selection.createRange();
                range.moveStart('character', -this.element.value.length);
                var arr = range.text.split(sentinelChar)
                return arr.length === 1 ? arr[0] : arr[1];
            }
        });

        TextCompleteAdapter['IETextarea'] = IETextarea;

        // ContentEditable adapter
        var ContentEditable = Adapter.extend({

            select: function (value, strategy) {
                var pre = this.getTextFromHeadToCaret();
                var sel = window.getSelection()
                var range = sel.getRangeAt(0);
                var selection = range.cloneRange();
                selection.selectNodeContents(range.startContainer);
                var content = selection.toString();
                var post = content.substring(range.startOffset);
                var newSubstr = strategy.replace(value);
                if ($.isArray(newSubstr)) {
                    post = newSubstr[1] + post;
                    newSubstr = newSubstr[0];
                }
                pre = pre.replace(strategy.match, newSubstr);
                range.selectNodeContents(range.startContainer);
                range.deleteContents();
                var node = document.createTextNode(pre + post);
                range.insertNode(node);
                range.setStart(node, pre.length);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            },

            _getCaretRelativePosition: function () {
                var range = window.getSelection().getRangeAt(0).cloneRange();
                var node = document.createElement('span');
                range.insertNode(node);
                range.selectNodeContents(node);
                range.deleteContents();
                var $node = $(node);
                var position = $node.offset();
                position.left -= this.$element.offset().left;
                position.top += $node.height() - this.$element.offset().top;
                position.lineHeight = $node.height();
                // var dir = this.$element.attr('dir') || this.$element.css('direction');
                // if (dir === 'rtl') {
                //     position.left -= this.listView.$el.width();
                // }
                $node.remove();
                return position;
            },
            getTextFromHeadToCaret: function () {
                var range = window.getSelection().getRangeAt(0);
                var selection = range.cloneRange();
                selection.selectNodeContents(range.startContainer);
                return selection.toString().substring(0, range.startOffset);
            }
        });

        TextCompleteAdapter['ContentEditable'] = ContentEditable;

    })()

    var TextComplete = Widget.extend({

        setup: function () {
            var defaults = {
                delay: 200
            }
            this.options = $.extend(defaults, this.options);
            TextComplete.superClass.setup.call(this);

            this.strategies = this.options.strategies;

            var Adapter, adapter_class;
            if (this.$element.is('textarea')) {
                adapter_class = typeof this.element.selectionEnd === 'number' ? 'Textarea' : 'IETextarea';
            } else {
                adapter_class = 'ContentEditable';
            }

            Adapter = TextCompleteAdapter[adapter_class];

            this.adapter = new Adapter({
                element: this.element,
                delay: this.options.delay
            }).on('search', this.search, this)

            var dropdown_options = $.extend({
                isTextComplete: true,
                inputAdapter: this.adapter,
                changeOnSelect: false,
                allowEmptyQuery: true,
                selectFirst: true,
                themeClass: this.options.themeClass,
                align: null
            }, this.options.dropdown_options || {});
            this.dropdown = new AutoComplete(dropdown_options).before('show', function(){
                this.setPosition(this.input.getCaretPosition());
            }).on('selected', function(data){
                this.adapter.select(data, this.strategy);
            }, this).after('hide', function(){
                this._term = null;
            }, this);

            var that = this;
            $.map(this.strategies, function(strategy){
                if(isString(strategy.data)){
                    strategy.data = {source: strategy.data};
                }
                strategy.dataSource = new DataSource(strategy.data);
                strategy.dataSource.on('data', function(data){
                    this.dropdown.data = data;
                    if(data.length){
                        this.dropdown._fillItems();
                    } else {
                        this.dropdown.hide();
                    }
                }, that);
                strategy.index = strategy.index || 1;
            })
        },

        destroy: function(){
            delete this.strategies;
            this.dropdown.destroy();
            TextComplete.superClass.destroy.call(this);
        },

        search: function(text){
            text != null || (text = this.adapter.getTextFromHeadToCaret());
            var searchQuery = this._extractSearchQuery(text);
            if (searchQuery.length) {
                var term = searchQuery[1];
                // Ignore shift-key, ctrl-key and so on.
                if (this._term === term) return;
                this._term = term;
                this._search.apply(this, searchQuery);
            } else {
                this.dropdown.hide();
            }
        },

        _search: function(strategy, term, match) {
            this.dropdown.dataSource = strategy.dataSource;
            // TODO: access autocomplete's itemTpl options directly, not good, need getter, setter
            this.dropdown.options.itemTpl = strategy.template;
            this.dropdown.input.trigger('change', term)
            this.strategy = strategy;
        },

        _extractSearchQuery: function (text) {
            for (var i = 0; i < this.strategies.length; i++) {
                var strategy = this.strategies[i];
                var match = text.match(strategy.match);
                if(match){
                    return [strategy, match[strategy.index], match];
                }
            }
            return [];
        }
    });


    var pub = {};
    pub.Overlay = Overlay;
    pub.Popup = Popup;
    pub.Tip = Tip;
    pub.Dialog = Dialog;
    pub.ConfirmBox = ConfirmBox;
    pub.AutoComplete = AutoComplete;
    pub.ContactSelect = ContactSelect;
    pub.TextComplete = TextComplete;
    pub.Tree = Tree;

    pub.Drag = Drag;

    return pub;
}));
