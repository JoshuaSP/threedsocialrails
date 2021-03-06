define( ['three', 'tween', 'webSocketRails', 'renderer', 'camera', 'controls', 'scene', 'monkeys', 'raycaster', 'underscore', 'lights', 'jquery', 'tour'],
  function (THREE, TWEEN, WebSocketRails, renderer, camera, controls, scene, monkeys, myRaycaster) {

  var dispatcher, tweetUrls, selectedMonkey, mouse, intersects, pointedMonkeys,
    distances, tween, urls, upperCorner, tour,
    mouseDownTime = 0,
    highlightColor = new THREE.Color(0xf0c96e);

  var prepopulate, twSphereZoom, showError;

  return {
    init: function () {
      camera.position.z = 4000;

      $('.threedsocial').on( 'mousedown', onMouseDown);

      function setMouse(event) {
        mouse = {};
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
        return mouse;
      }

      function onMouseDown( event ) {
        // this.zoomIn();
        mouse = setMouse(event);

        myRaycaster.setFromCamera(mouse, camera);
        intersects = myRaycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
          selectIntersection(intersects, mouse);
          if (event.button === 2) {
            monkeys.remove(selectedMonkey);
            selectedMonkey = null;
          } else if (Date.now() - mouseDownTime < 500) {
            openWindow();
            monkeys.remove(selectedMonkey);
            selectedMonkey = null;
          } else {
            mouseDownTime = Date.now();
          }
        } else {
          controls.orbitStart(event);
        }
        $('.threedsocial').on('mousemove', onMouseMove);
        $('.threedsocial').on('mouseup', onMouseUp);
      }

      function onMouseMove( event ) {
        if (selectedMonkey) {
          selectedMonkey.move(setMouse(event));
        } else {
          controls.orbitCamera(event);
        }
      }

      function selectIntersection(intersects, mouse) {
        pointedMonkeys = _.uniq(intersects.map(function (intersect) {
          return intersect.object.parent.parent;
        }));
        distances = pointedMonkeys.map(function (monkey) {
          return monkey.position.distanceTo( camera.position );
        });
        selectedMonkey = pointedMonkeys[distances.indexOf(Math.min.apply(null, distances))];
        selectedMonkey.highlight(highlightColor);
        upperCorner = selectedMonkey.position.clone().project(camera);
        _.extend(selectedMonkey.userData, {
          selectOffset: {
            x: upperCorner.x - mouse.x,
            y: upperCorner.y - mouse.y
          },
          distance: selectedMonkey.position.distanceTo(camera.position),
          selected: true
        });
        tween = selectedMonkey.userData.tween;
        if (tween) {
          tween.stop();
        }
      }
      showError = function showError(response) {
        console.log('hello');
        var $el = $('<div class="error">');
        $el.html('Streaming service temporarily unavailable. Please try again soon..');
        $('body').append($el);
        setTimeout(function () {
          $el.fadeIn();
          setTimeout(function () {
            $el.fadeOut();
          }, 4000);
        }, 7000);
      };

      function dispatchMonkey(tweet, starting) {
        var tweetUrls = /https?:\/\/t\.co\/\w{0,11}/g.exec(tweet.text);
        if(tweetUrls) {
          tweetUrls.forEach(function(tweetUrl) {
            tweet.text = tweet.text.replace(tweetUrl, '');
          });
        }
        tweet.text = tweet.text.replace('&amp;', '&');
        tweet.text = tweet.text.replace(/\n\s*\n/g, '\n');
        tweet.text = tweet.text.replace(/\n\s*\z/, '');
        monkeys.dispatch(tweet, tweetUrls, starting);
      }

      function openWindow() {
        urls = selectedMonkey.userData.tweetUrls;
        if (urls) {
          urls.forEach(function(tweetUrl){
            window.open(tweetUrl);
            window.focus();
          });
        }
        monkeys.remove(selectedMonkey);
      }

      function onMouseUp () {
        if (selectedMonkey) {
          selectedMonkey.dehighlight();
          selectedMonkey.userData.selected = false;
          selectedMonkey.wander();
          selectedMonkey = null;
        }

        $('.threedsocial').off('mousemove');
        $('.threedsocial').off('mouseup');

        controls.resetState();
      }

      function addInstructions () {
        $('.instructions').fadeIn(6000);
      }

      twSphereZoom = function zoomIn (tweetChannel) {
        controls.setRadius = 100000;
        addInstructions();
        new TWEEN.Tween(controls)
          .to({ setRadius: 500, setTheta: 15 }, 8000)
          .onUpdate(function() {
            controls.update();
          })
          .easing(TWEEN.Easing.Quadratic.Out)
          .onComplete(function () {
            tweetChannel.bind('new', dispatchMonkey);
          })
          .start();
        controls.setPhi = 1;
        new TWEEN.Tween(controls)
          .to({ setPhi: 2 }, 1500)
          .repeat(2)
          .easing(TWEEN.Easing.Sinusoidal.InOut)
          .yoyo(true)
          .start();
      };

      prepopulate = function populate (tweets) {
        tweets.forEach(function (tweet) {
          dispatchMonkey(tweet, true);
        });
      };
    },   // this is the end of init()

    animate: function () {
      requestAnimationFrame(this.animate.bind(this));
      TWEEN.update();
      renderer.clear();
      renderer.render(scene, camera);
    },

    initTweetStream: function (tweetOptions) {
      if (dispatcher) dispatcher.trigger('connection_closed');
      var host = ENV === "development" ? 'localhost:3000' : 'twittersphere.herokuapp.com';
      dispatcher = new WebSocketRails(host + '/websocket');
      dispatcher.trigger(
        'new',
        tweetOptions,
        function(response) {
          if(response.failed) {
            console.log('Twitter error:' + response.failed.message);
          } else {
            prepopulate(response.tweets);
          }
          tweetChannel = dispatcher.subscribe(response.channel_name);
          tweetChannel.bind('streaming_error', showError);
          twSphereZoom(tweetChannel);
        },
        function(response) {
          console.log(response);
        }
      );
    }
  };
});
