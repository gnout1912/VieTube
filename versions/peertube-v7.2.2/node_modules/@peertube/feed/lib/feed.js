"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Feed = void 0;
var atom1_1 = require("./atom1");
var json_1 = require("./json");
var podcast_1 = require("./podcast");
var rss2_1 = require("./rss2");
var Feed = (function () {
    function Feed(options) {
        var _this = this;
        this.items = [];
        this.podcastItems = [];
        this.podcastLiveItems = [];
        this.categories = [];
        this.contributors = [];
        this.extensions = [];
        this.addItem = function (item) { return _this.items.push(item); };
        this.addPodcastItem = function (podcastItem) { return _this.podcastItems.push(podcastItem); };
        this.addPodcastLiveItem = function (podcastLiveItem) { return _this.podcastLiveItems.push(podcastLiveItem); };
        this.addCategory = function (category) { return _this.categories.push(category); };
        this.addContributor = function (contributor) { return _this.contributors.push(contributor); };
        this.addExtension = function (extension) { return _this.extensions.push(extension); };
        this.atom1 = function () { return (0, atom1_1.default)(_this); };
        this.rss2 = function () { return (0, rss2_1.default)(_this); };
        this.podcast = function () { return (0, podcast_1.default)(_this); };
        this.json1 = function () { return (0, json_1.default)(_this); };
        this.options = options;
    }
    return Feed;
}());
exports.Feed = Feed;
//# sourceMappingURL=feed.js.map