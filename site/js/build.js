/* Speak Up | The Speaking Lab — which build is this? (production or development preview)
   The development preview (https://stevenbennett-hub.github.io/speaking-lab-preview/) is built by the separate
   speaking-lab-preview repository from this repository's dev branch. Preview behavior turns on only when BOTH:
     1. the page is served from the preview address (/speaking-lab-preview/…) or from this computer (localhost), and
     2. the preview workflow added data/preview.json with {"channel": "preview"} (that file is never committed here;
        a test and the production workflow both fail if it is).
   The production address (/speaking-lab/) never even asks for data/preview.json, so production cannot switch to
   preview behavior by accident. Preview behavior: all six high school units open, any date can be viewed, a
   "Development Preview" banner, and its own saved progress (every localStorage key is stored under "slpreview:",
   so preview testing never reads or changes students' real progress on the same github.io address).
   The college gate and the teacher-view code work exactly as in production. Like every gate on this site, this is
   a classroom convenience, not security. */
(function (root) {
  "use strict";
  var PREFIX = "slpreview:";
  function previewPlace(loc) {
    if (!loc) return false;
    return /^\/speaking-lab-preview(\/|$)/.test(loc.pathname || "") || loc.hostname === "localhost" || loc.hostname === "127.0.0.1";
  }
  function decide(loc, file) {
    return !!(previewPlace(loc) && file && typeof file === "object" && file.channel === "preview");
  }
  /** Keep every localStorage key of this page under PREFIX (only for this Storage object). */
  function namespaceStorage(store, proto) {
    if (!store || !proto || proto.__slpreview) return false;
    var get = proto.getItem, set = proto.setItem, rem = proto.removeItem, key = proto.key, clear = proto.clear;
    var lenDesc = Object.getOwnPropertyDescriptor(proto, "length");
    var own = function (s) { var out = [], n = lenDesc.get.call(s); for (var i = 0; i < n; i++) { var k = key.call(s, i); if (k != null && k.indexOf(PREFIX) === 0) out.push(k); } return out; };
    proto.getItem = function (k) { return get.call(this, this === store ? PREFIX + k : k); };
    proto.setItem = function (k, v) { return set.call(this, this === store ? PREFIX + k : k, v); };
    proto.removeItem = function (k) { return rem.call(this, this === store ? PREFIX + k : k); };
    proto.key = function (i) { if (this !== store) return key.call(this, i); var k = own(this)[i]; return k == null ? null : k.slice(PREFIX.length); };
    proto.clear = function () { if (this !== store) return clear.call(this); var self = this; own(this).forEach(function (k) { rem.call(self, k); }); };
    Object.defineProperty(proto, "length", { configurable: true, enumerable: true, get: function () { return this === store ? own(this).length : lenDesc.get.call(this); } });
    Object.defineProperty(proto, "__slpreview", { value: true });
    return true;
  }
  var B = { PREFIX: PREFIX, previewPlace: previewPlace, decide: decide, namespaceStorage: namespaceStorage, preview: false };
  B.activate = function () {
    try { namespaceStorage(root.localStorage, root.Storage && root.Storage.prototype); } catch (e) {}
    B.preview = true;
    if (root.document) root.document.documentElement.setAttribute("data-build", "preview");
  };
  root.SLBuild = B;
})(typeof window !== "undefined" ? window : globalThis);
