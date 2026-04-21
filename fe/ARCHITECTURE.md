# Architecture decisions

## What is this app?
An app meant to help me learn as a senior frontend engineer.

### Objective of this app
Show how to handle showing 100+ data/second without crashing the browser

### How will this app work?
1. 100+ data/second from backend, likely websocket stream.
2. then display the data as a graph.

## The framework/libraries:
1. React with Vite, no need for SSR since this is just a side project. However, even on a production level app, I don't think SSR/SSG is necessary since the data always change/change rapidly.
2. MSW to mock the data stream.
3. Still unsure how to visualize/render the data, probably CanvasAPI or WebGL.
