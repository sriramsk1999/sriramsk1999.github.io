---
layout: archive
title: "mlmonad"
permalink: /mlmonad/
author_profile: true
---

> "The deeper the roots, the higher the reach." – Unknown

**mlmonad** intends to be a technical blog covering foundational / seminal concepts across Computer Science and Machine Learning, with a focus on my own interests - Computer Vision & Robotics. The goal is to thoroughly understand the pillars of the field, while serving as an avenue for exploring interesting concepts and cool tools. Each blogpost will tackle one concept, covering:

- An overview of the technique and its uses 
- A *detailed* explanation embracing theory / formulae
- Visualizations
- Self-contained and documented code implementation
- Extensions of the technique


## Posts

{% for post in site.mlmonad %}
  * [{{ post.title }}]({{ post.url }})
{% endfor %}
