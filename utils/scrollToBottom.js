module.exports = scrollBottom;

// https://stackoverflow.com/questions/33094727/selenium-scroll-till-end-of-the-page
function scrollBottom(){
    let count = arguments[arguments.length - 2] || 0x7fffffff;
    let callback = arguments[arguments.length - 1];
  
    // get the scrollable container
    let elm = document.elementFromPoint(window.innerWidth - 25, window.innerHeight / 2);
    for ( ;elm && (++elm.scrollTop, !elm.scrollTop); elm=elm.parentElement);
    elm = elm || document.documentElement;
  
    // hook XMLHttpRequest to monitor Ajax requests
    if (!('idle' in XMLHttpRequest)) (function(){
      let n = 0, t = Date.now(), send = XMLHttpRequest.prototype.send;
      let dispose = function(){ --n; t = Date.now(); };
      let loadend = function(){ setTimeout(dispose, 1) };
      XMLHttpRequest.idle = function() { return n > 0 ? 0 : Date.now() - t; };
      XMLHttpRequest.prototype.send = function(){
        ++n;
        this.addEventListener('loadend', loadend);
        send.apply(this, arguments);
      };
    })();
  
    // scroll until steady scrollHeight or count of scroll and no pending request
    let i = 0, scrollHeight = -1, scrollTop = -1;
    (function scroll(){
      if ((scrollHeight === elm.scrollHeight || i === count) && XMLHttpRequest.idle() > 60)
        return callback(i);
      scrollTop = elm.scrollTop;
      scrollHeight = elm.scrollHeight;
      if (i < count)
        i += (elm.scrollTop = 0x7fffffff, scrollTop !== elm.scrollTop);
      setTimeout(scroll, 100);
    })();
  }