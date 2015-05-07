# [The Twittersphere!][1]
### (formerly threedsocial)

The Twittersphere is a three-dimensional tweet-reader using Three.js, created by Joshua Penman and Kevin Gan.

It sets up backend connections to Twitter's REST and streaming APIs, and streams tweets via websockets to each connected client, depending on the tags they request. The streaming connection is done within a single, separate thread, which requests tweets for all connected clients, and then parcels them out to the appropriate client.

On the front end, there were some interesting problems to solve. Several iterations of naive approaches resulted in memory leaks and/or massive jank.

The solution was a variation on the flyweight pattern - to make each object as similar as possible, with only the actuall differences in them being different.

We accomplished this by:
- Instantiating the meshes for each letter only once on the creation of , storing those meshes, and then assembling them to create each tweet.
- Using only one material for every letter in the space, except when the tweet needed to highlight or fade in/out, at which point a new material is instantiated, used as need, and then discarded.

[1]: http://twittersphere.space
