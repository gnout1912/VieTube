import { Feed } from "../feed"
import { published, sampleFeed, updated } from "./setup"

describe("rss 2.0", () => {
  it("should generate a valid feed", () => {
    const actual = sampleFeed.rss2()
    expect(actual).toMatchSnapshot()
  })
  it("should generate a valid feed with image properties", () => {
    sampleFeed.addItem({
      title: "Hello World",
      guid: "419c523a-28f4-489c-877e-9604be64c001",
      link: "https://example.com/hello-world2",
      description: "This is an article about Hello World.",
      content: "Content of my item",
      author: [
        {
          name: "Jane Doe",
          email: "janedoe@example.com",
          link: "https://example.com/janedoe",
        },
        {
          name: "Joe Smith",
          email: "joesmith@example.com",
          link: "https://example.com/joesmith",
        },
      ],
      extensions: [
        {
          name: "_item_extension_1",
          objects: {
            about: "just an item extension example",
            dummy1: "example",
          },
        },
        {
          name: "_item_extension_2",
          objects: {
            about: "just a second item extension example",
            dummy1: "example",
          },
        },
      ],
      category: [
        {
          name: "Grateful Dead",
        },
        {
          name: "MSFT",
          domain: "http://www.fool.com/cusips",
        },
      ],
      date: updated,
      image: { url: "https://example.com/hello-world.jpg", length: 12665 },
      published,
    })
    const actual = sampleFeed.rss2()
    expect(actual).toMatchSnapshot()
  })
  it("should generate a valid feed with enclosure", () => {
    sampleFeed.addItem({
      title: "Hello World",
      guid: "419c523a-28f4-489c-877e-9604be64c001",
      link: "https://example.com/hello-world2",
      description: "This is an article about Hello World.",
      content: "Content of my item",
      author: [
        {
          name: "Jane Doe",
          email: "janedoe@example.com",
          link: "https://example.com/janedoe",
        },
        {
          name: "Joe Smith",
          email: "joesmith@example.com",
          link: "https://example.com/joesmith",
        },
      ],
      extensions: [
        {
          name: "_item_extension_1",
          objects: {
            about: "just an item extension example",
            dummy1: "example",
          },
        },
        {
          name: "_item_extension_2",
          objects: {
            about: "just a second item extension example",
            dummy1: "example",
          },
        },
      ],
      category: [
        {
          name: "Grateful Dead",
        },
        {
          name: "MSFT",
          domain: "http://www.fool.com/cusips",
        },
      ],
      date: updated,
      enclosure: { url: "https://example.com/hello-world.jpg", length: 12665 },
      published,
    })
    const actual = sampleFeed.rss2()
    expect(actual).toMatchSnapshot()
  })
  it("should generate a valid feed with audio", () => {
    sampleFeed.addItem({
      title: "Hello World",
      link: "https://example.com/hello-world3",
      description: "This is an article about Hello World.",
      content: "Content of my item",
      author: [
        {
          name: "Jane Doe",
          email: "janedoe@example.com",
          link: "https://example.com/janedoe",
        },
        {
          name: "Joe Smith",
          email: "joesmith@example.com",
          link: "https://example.com/joesmith",
        },
      ],
      extensions: [
        {
          name: "_item_extension_1",
          objects: {
            about: "just an item extension example",
            dummy1: "example",
          },
        },
        {
          name: "_item_extension_2",
          objects: {
            about: "just a second item extension example",
            dummy1: "example",
          },
        },
      ],
      category: [
        {
          name: "Grateful Dead",
        },
        {
          name: "MSFT",
          domain: "http://www.fool.com/cusips",
        },
      ],
      date: updated,
      audio: { url: "https://example.com/hello-world.mp3", length: 12665, type: "audio/mpeg" },
      published,
    })
    const actual = sampleFeed.rss2()
    expect(actual).toMatchSnapshot()
  })
  it("should generate a valid feed with video", () => {
    const sampleFeed = new Feed({
      title: "Feed Title",
      description: "This is my personnal feed!",
      link: "http://example.com/",
      id: "http://example.com/",
      language: "en",
      ttl: 60,
      image: "http://example.com/image.png",
      copyright: "All rights reserved 2013, John Doe",
      hub: "wss://example.com/",
      updated, // optional, default = today

      author: {
        name: "John Doe",
        email: "johndoe@example.com",
        link: "https://example.com/johndoe",
      },
    })
    sampleFeed.addItem({
      title: "Hello World",
      id: "419c523a-28f4-489c-877e-9604be64c005",
      link: "https://example.com/hello-world4",
      description: "This is an article about Hello World.",
      content: "Content of my item",
      author: [
        {
          name: "Jane Doe",
          email: "janedoe@example.com",
          link: "https://example.com/janedoe",
        },
        {
          name: "Joe Smith",
          email: "joesmith@example.com",
          link: "https://example.com/joesmith",
        },
      ],
      extensions: [
        {
          name: "_item_extension_1",
          objects: {
            about: "just an item extension example",
            dummy1: "example",
          },
        },
        {
          name: "_item_extension_2",
          objects: {
            about: "just a second item extension example",
            dummy1: "example",
          },
        },
      ],
      category: [
        {
          name: "Grateful Dead",
        },
        {
          name: "MSFT",
          domain: "http://www.fool.com/cusips",
        },
      ],
      date: updated,
      video: "https://example.com/hello-world.mp4"
    })
    const actual = sampleFeed.rss2()
    expect(actual).toMatchSnapshot()
  })

  test('it should generate a Media RSS 1.5 feed', () => {
    const sampleFeed = new Feed({
      title: "Feed Title",
      description: "This is my personnal feed!",
      link: "http://example.com/",
      id: "http://example.com/",
      language: "en",
      ttl: 60,
      image: "http://example.com/image.png",
      copyright: "All rights reserved 2013, John Doe",
      hub: "wss://example.com/",
      updated,

      author: {
        name: "John Doe",
        email: "johndoe@example.com",
        link: "https://example.com/johndoe",
      },
    })

    sampleFeed.addItem({
      title: 'Hello World',
      id: 'https://example.com/hello-world',
      link: 'https://example.com/hello-world',
      description: 'This is an article about Hello World.',
      date: published,
      author: [{
        name: 'Jane Doe',
        link: 'jane.doe@example.com'
      }],
      torrents: [
        {
          url: 'https://example.com/hello-world-vp8-ogg.torrent'
        },
        {
          url: 'https://example.com/hello-world-vp9-opus.torrent'
        }
      ],
      videos: [
        {
          url: 'https://example.com/hello-world.vp9'
        }
      ],
      thumbnails: [
        {
          url: 'https://example.com/hello-world.png',
          height: 320,
          width: 560
        }
      ],
      categories: [
        { value: 'Category 1' },
        { value: 'Category 2' }
      ],
      community: {
        statistics: {
          views: 20
        }
      },
      embed: {
        url: "https://example.com/embed/videoEmbed",
        allowFullscreen: true
      },
      keywords: [
        'Keyword 1',
        'Keyword 2'
      ],
      player: {
        url: "https://example.com/embed/videoEmbed"
      },
      subTitle: [
        {
          href: "https://example.com/subs/0001.vtt",
          lang: "en-us",
          // invalid because it doesn't have the type attribute
          type: null as unknown as string
        },
        {
          href: "https://example.com/subs/0001.vtt",
          lang: "en-us",
          type: "application/vtt"
        }
      ]
    })

    let expected = `<?xml version=\"1.0\" encoding=\"utf-8\"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>Feed Title</title>
        <link>http://example.com/</link>
        <description>This is my personnal feed!</description>
        <lastBuildDate>Sat, 13 Jul 2013 23:00:00 GMT</lastBuildDate>
        <docs>https://validator.w3.org/feed/docs/rss2.html</docs>
        <generator>https://github.com/jpmonette/feed</generator>
        <language>en</language>
        <ttl>60</ttl>
        <image>
            <title>Feed Title</title>
            <url>http://example.com/image.png</url>
            <link>http://example.com/</link>
        </image>
        <copyright>All rights reserved 2013, John Doe</copyright>
        <atom:link href="wss://example.com/" rel="hub"/>
        <item>
            <title><![CDATA[Hello World]]></title>
            <link>https://example.com/hello-world</link>
            <guid>https://example.com/hello-world</guid>
            <pubDate>Wed, 10 Jul 2013 23:00:00 GMT</pubDate>
            <description><![CDATA[This is an article about Hello World.]]></description>
            <dc:creator>Jane Doe</dc:creator>
            <media:category scheme="http://search.yahoo.com/mrss/category_schema">Category 1</media:category>
            <media:category scheme="http://search.yahoo.com/mrss/category_schema">Category 2</media:category>
            <media:community>
                <media:statistics views="20"/>
            </media:community>
            <media:embed url="https://example.com/embed/videoEmbed"/>
            <media:keywords>Keyword 1, Keyword 2</media:keywords>
            <media:subTitle href="https://example.com/subs/0001.vtt" type="application/vtt" lang="en-us"/>
            <media:player url="https://example.com/embed/videoEmbed"/>
            <media:group>
                <media:peerLink type="application/x-bittorrent" href="https://example.com/hello-world-vp8-ogg.torrent" isDefault="false"/>
                <media:peerLink type="application/x-bittorrent" href="https://example.com/hello-world-vp9-opus.torrent" isDefault="false"/>
                <media:content url="https://example.com/hello-world.vp9" isDefault="true"/>
            </media:group>
            <media:thumbnail url="https://example.com/hello-world.png" height="320" width="560"/>
            <media:rating>nonadult</media:rating>
            <media:title type="plain">Hello World</media:title>
            <media:description type="plain">This is an article about Hello World.</media:description>
        </item>
    </channel>
</rss>`

    let actual = sampleFeed.rss2()

    expect(actual).toBe(expected)
  })
})
