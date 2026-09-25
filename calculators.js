/* SG Calculators embed loader: https://github.com/jpokstone/sg-calculators */
(function () {
  var s = document.currentScript;
  var src = (s && s.src) || 'https://jpokstone.github.io/sg-calculators/calculators.js';
  var base = src.replace(/[^\/]*(\?.*)?$/, '');
  var q = src.indexOf('?') > -1 ? src.slice(src.indexOf('?')) : '';
  import(base + 'src/index.js' + q).catch(function (e) { console.error('[sg-calc] could not load calculators', e); });
})();
