import { Author, Extension, FeedOptions, Item, PodcastItem, PodcastLiveItem } from "./typings";
export { Author, Extension, FeedOptions, Item, PodcastItem, PodcastLiveItem };
export declare class Feed {
    options: FeedOptions;
    items: Item[];
    podcastItems: PodcastItem[];
    podcastLiveItems: PodcastLiveItem[];
    categories: string[];
    contributors: Author[];
    extensions: Extension[];
    constructor(options: FeedOptions);
    addItem: (item: Item) => number;
    addPodcastItem: (podcastItem: PodcastItem) => number;
    addPodcastLiveItem: (podcastLiveItem: PodcastLiveItem) => number;
    addCategory: (category: string) => number;
    addContributor: (contributor: Author) => number;
    addExtension: (extension: Extension) => number;
    atom1: () => string;
    rss2: () => string;
    podcast: () => string;
    json1: () => string;
}
