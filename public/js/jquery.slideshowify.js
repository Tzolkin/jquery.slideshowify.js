/**
* Slideshowify is a super easy-to-use jQuery plugin for generating image slideshows
* with a Ken Burns Effect, where images which don't fit the screen exactly
* (generally the case) are cropped and either panned across the screen or
* zoomed in a randomly determined direction.
*
* Author: Aleksandar Kolundzija
* Modified by: Francisco Zavala
* version 0.0.1
*
* @requires jquery
* @requires jquery.transit (http://ricostacruz.com/jquery.transit/) as of version 0.9
*
* (The MIT License)
*
* Copyright (c) 2017 Francisco Zavala, Tzolkin
*
* Permission is hereby granted, free of charge, to any person obtaining
* a copy of this software and associated documentation files (the
* 'Software'), to deal in the Software without restriction, including
* without limitation the rights to use, copy, modify, merge, publish,
* distribute, sublicense, and/or sell copies of the Software, and to
* permit persons to whom the Software is furnished to do so, subject to
* the following conditions:
*
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
* IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
* CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
* TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
* SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/* globals jQuery, Image */
(function ($) {
  $.fn.slideshowify = function (/* config */) {
    var _self = this
    var _imgs = []
    var _imgIndex = -1
    var _imgIndexNext = 0   // for preloading next
    var _transition = true  // use CSS3 transitions (default might be changed during init)
    var _easing = 'in-out'
    var _viewEl = document   // filled by slideshow (used for determining dimensions)
    var _containerId = 'slideshowify-' + new Date().getTime()
    var _containerCSS = {
      'position': 'absolute',
      'overflow': 'hidden',
      'z-index': '-2',
      'left': '0',
      'top': '0',
      'width': '100%',
      'height': '100%'
    }
    var _cfg = {
      parentEl: 'body', // slideshow-container is injected into this
      blend: 'into',    // "into" || "toBg"
      randomize: false,
      fadeInSpeed: 1500,
      fadeOutSpeed: 1500,
      aniSpeedMin: 9000,
      aniSpeedMax: 15000,
      transSpeed: 5000
    }
    var _$viewEl
    var _$parentEl

    if (arguments[0]) {
      $.extend(_cfg, arguments[0]) // reconfigure
      if (_cfg.parentEl !== 'body') {
        _viewEl = _cfg.parentEl
      }
    }

    // local refs
    _$viewEl = $(_viewEl)
    _$parentEl = $(_cfg.parentEl)

    /**
    * Fill viewEl with image (most likely cropped based on its dimensions and view size).
    * @TODO Add support for target divs whose dimensions were set with %s (get px value from parents).
    * @TODO Add a window resize handler (adjust photo dims/margins).
    */
    function _revealImg (curImg) {
      var $img = $(this)
      var viewW = _$viewEl.width()
      var viewH = _$viewEl.height()
      var viewRatio = viewW / viewH
      var imgRatio = $img.width() / $img.height()
      var marginThreshold = Math.floor(Math.max(viewW, viewH) / 10) // for zoom transitions
      var direction = Math.round(Math.random())
      var transAttr = {}
      var transProps, transPropsCopy
      var marginPixels
      var modDims // will hold values to set and animate

      if (imgRatio > viewRatio) {
        modDims = _transition
        ? direction ? {dim: 'left', attr: 'x', sign: '-'} : {dim: 'right', attr: 'x', sign: ''}
        : direction ? {dim: 'left', attr: 'left', sign: '-'} : {dim: 'right', attr: 'right', sign: '-'}
        $img.height(viewH + 'px').width(curImg.width * (viewH / curImg.height) + 'px')
        marginPixels = $img.width() - viewW
      } else {
        modDims = _transition
        ? direction ? {dim: 'top', attr: 'y', sign: '-'} : {dim: 'bottom', attr: 'y', sign: ''}
        : direction ? {dim: 'top', attr: 'top', sign: '-'} : {dim: 'bottom', attr: 'bottom', sign: '-'}
        $img.width(viewW + 'px').height(curImg.height * (viewW / curImg.width) + 'px')
        marginPixels = $img.height() - viewH
      }
      $img.css(modDims.dim, '0')
      transAttr[modDims.attr] = modDims.sign + marginPixels + 'px'

      // if marginThreshold is small, zoom a little instead of panning
      if (_transition && marginPixels < marginThreshold) {
        if (direction) { // zoom out
          $img.css('scale', '1.2')
          transAttr = {'scale': '1'}
        } else { // zoom in
          transAttr = {'scale': '1.2'}
        }
      }

      // Math.min(Math.max(marginPixels * 10, _cfg.aniSpeedMin), _cfg.aniSpeedMax)
      transProps = {
        duration: _cfg.transSpeed,
        easing: _easing,
        queue: false,
        complete: function () {
          _$parentEl.trigger('beforeFadeOut', _imgs[_imgIndex])
          $img.fadeOut(_cfg.fadeOutSpeed, function () {
            _$parentEl.trigger('afterFadeOut', _imgs[_imgIndex])
            $img.remove()
          })
          _loadImg()
        }
      }

      // TODO delete me!!!
      // transPropsCopy = {
      //   duration: _cfg.transSpeed,
      //   easing: _easing,
      //   queue: false,
      //   complete: function () {
      //     // _$parentEl.trigger('beforeFadeOut', _imgs[_imgIndex])
      //     // $img.fadeOut(_cfg.fadeOutSpeed, function () {
      //     //   _$parentEl.trigger('afterFadeOut', _imgs[_imgIndex])
      //     //   $img.remove()
      //     // })
      //   }
      // }
      $img.css('transform-origin', 'left')

      _$parentEl.trigger('beforeFadeIn', _imgs[_imgIndex])
      $img.fadeIn(_cfg.fadeInSpeed, function () {
        $img.css('z-index', -1)
        _$parentEl.trigger('afterFadeIn', _imgs[_imgIndex])
      })

      // use animate if css3 transitions aren't supported
      _transition
      ? $img.transition($img.transition($.extend(transAttr, transProps)))
      : $img.animate(transAttr, transProps)
    } // end of _revealImg()

    /**
    * Loads image and starts display flow
    */
    function _loadImg () {
      var img = new Image()
      var nextImg = new Image() // for preloading
      var len = _imgs.length

      _imgIndex = (_imgIndex < len - 1) ? _imgIndex + 1 : 0

      $(img)
      // assign handlers
      .on('load', function () {
        if (_cfg.blend === 'into') {
          $(this).css({'position': 'absolute', 'z-index': '-2'})
          $('#' + _containerId).append(this)
        } else { // @TODO verify that this works
          $('#' + _containerId).empty().append(this)
        }
        _revealImg.call(this, _imgs[_imgIndex])
      })
      .on('error', function () {
        throw new Error("Oops, can't load the image.")
      })
      .hide()
      .attr('src', _imgs[_imgIndex].src) // load

      if (_imgIndexNext === len) return // nothing left to preload

      // preload next image
      _imgIndexNext = _imgIndex + 1
      if (_imgIndexNext < len - 1) {
        nextImg.src = _imgs[_imgIndexNext].src
      }
    } // end of _loadImg()

    // INITIALIZE
    if (!$.support.transition) {
      _transition = false
      _easing = 'swing'
    }

    if (!_cfg.imgs) { // images were passed as selector
      // load images into private array
      $(this).each(function (i, img) {
        $(img).hide()
        _imgs.push({
          src: $(img).attr('src'),
          w: $(img).width(),
          h: $(img).height()
        })
      })
    } else {
      _imgs = _cfg.imgs
    }

    if (_cfg.randomize) {
      _imgs.sort(function () { return 0.5 - Math.random() })
    }

    // create container div
    $("<div id='" + _containerId + "'></div>")
    .css(_containerCSS)
    .appendTo(_cfg.parentEl)

    // start
    _loadImg()

    return this
  }

  /**
  * Expose slideshowify() to jQuery for use without DOM selector.
  */
  $.slideshowify = function (cfg) {
    var _self = this
    var _cfg = {
      dataUrl: '',
      dataType: 'json',
      async: true,
      filterFn: function (data) { return data } // default filter. does nothing
    }

    $.extend(_cfg, cfg)

    $.ajax({
      url: _cfg.dataUrl,
      dataType: _cfg.dataType,
      async: _cfg.async,
      success: function (imgs) {
        _cfg.imgs = _cfg.filterFn(imgs)
        $({}).slideshowify(_cfg)
      }
    })
  }
}(jQuery))
