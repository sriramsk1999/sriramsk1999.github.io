---
title: "DeepSmooth: Efficient and Smooth Depth Completion"
collection: publications
permalink: 
excerpt: 
date: 2023-06-18
venue: 'CVPR-W 2023: VOCVALC'
paperurl: https://openaccess.thecvf.com/content/CVPR2023W/VOCVALC/html/Krishna_DeepSmooth_Efficient_and_Smooth_Depth_Completion_CVPRW_2023_paper.html
citation: '<b>Krishna, Sriram</b> & Vandrotti, Basavaraja Shanthappa. Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 3357–3366, 2023'
---

Accurate and consistent depth maps are essential for numerous applications across domains such as robotics, Augmented Reality and others. High-quality depth maps that are spatially and temporally consistent enable tasks such as Spatial Mapping, Video Portrait effects and more generally, 3D Scene Understanding. Depth data acquired from sensors is often incomplete and contains holes whereas depth estimated from RGB images can be inaccurate. This work focuses on Depth Completion, the task of filling holes in depth data using color images. Most work in depth completion formulates the task at the frame level, individually filling each frame's depth. This results in undesirable flickering artifacts when the RGB-D video stream is viewed as a whole and has detrimental effects on downstream tasks. We propose DeepSmooth, a model that spatio-temporally propagates information to fill in depth maps. Using an EfficientNet and pseudo 3D-Conv based architecture, and a loss function which enforces consistency across space and time, the proposed solution produces smooth depth maps.
