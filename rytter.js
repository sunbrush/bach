REFINER = REFINER || {};

REFINER.rytter = (function () {
    'use strict';
	var rytterTree;
	var nfa = {
        	symbol: [],
        	next1: [],
	        next2: []
    };

//******* OBTAINING THE NFA , FOLLOWING THE RYTTER'S ALGORITHM *************
    var getNFA = function (tree) {
        var j, k = 0;
        var xe = 0, xo = 0;
        rytterTree = tree;
        
        //first step of Rytter's algorithm
        rytterTree = REFINER.preorder(rytterTree, function (elem) {  
            
            if (elem.info === ".") {
                elem.k = 0;
            } else {
                k += 1;
                elem.k = k;
            }
            xe += 1;
            elem.preid = xe;
            return elem;
        });
        
        //second step of Rytter's algorithm
        rytterTree = REFINER.postorder(rytterTree, function (elem) {
            if (elem.info !== ".") {
                elem.i = 2 * elem.k - 1;
                elem.f = 2 * elem.k;
            } else if (elem.info === ".") {
                elem.i = elem.left.i;
                elem.f = elem.right.f;
            }
            xo += 1;
            elem.postid = xo;
            return elem;
        });
	   
        rytterTree.length = xe;

        //third step of Rytter's algorithm
        for(j=0; j< 2*k; j++) {
            nfa.symbol[j] = '';
            nfa.next1[j] = 0;
            nfa.next2[j] = 0;
        }
        
        REFINER.preorder(rytterTree, function (node) {
            switch (true) {
                case /\|/.test(node.info):
                case /\+/.test(node.info):
                    nfa.next1[node.i-1] = node.left.i;
                    nfa.next2[node.i-1] = node.right.i;
                    nfa.next1[node.left.f-1] = node.f;
                    nfa.next1[node.right.f-1] = node.f;
                return;

                case /\./.test(node.info) :
                    nfa.next1[node.left.f-1] = node.right.i;
                return;

                case /\*/.test(node.info) :
                    nfa.next1[node.i-1] = node.left.i;
                    nfa.next2[node.i-1] = node.f;
                    nfa.next1[node.left.f-1] = node.left.i;
                    nfa.next2[node.left.f-1] = node.f;
                return;

                case /^[a-z]/.test(node.info) :
                case /^[A-Z]/.test(node.info) :
                    nfa.symbol[node.i-1] = node.info;
                    nfa.next1[node.i-1] = node.f;
                return;
            }
        });
        return nfa;
    };  // end of getNFA

    
    //apply the Rytter algorithm to the parse tree
    var rytterize = function () {
        var parse_tree = REFINER.getParseTree();
        getNFA(parse_tree);
        return nfa;
    };

// ************ DRAWING AND ANIMATING THE PARSING TREE AND THE NFA ****************
    
    // change the form of Rytter's tree from {info,n,k,i,f, left:{}, right:{}} 
    // to {info,n,k,i,f, children:[]}
    // so that it can be read and used by d3.layout.tree()
    var jsonizeT = function () {
        var treejson = {};
        //alert(JSON.stringify(rytterTree));
        treejson = REFINER.postorder(rytterTree, function someorder(node) { 
            var aux={children:[]};

            var cb = function(obj, nodex) {
                obj.info = nodex.info;
                obj.preid = nodex.preid;
                obj.postid = nodex.postid;
                obj.k = nodex.k;
                obj.i = nodex.i;
                obj.f = nodex.f;
                return obj;
            };
            
            switch (true) {
                case /\|/.test(node.info):
                case /\+/.test(node.info):
                case /\./.test(node.info):
                    aux.children.push(someorder(node.left, cb));
                    aux.children.push(someorder(node.right, cb));
                    cb(aux, node);
                    return aux;
                case /\*/.test(node.info):
                    aux.children.push(someorder(node.left, cb));
                    cb(aux, node);
                    return aux;
                case /^[a-z]/.test(node.info):
                case /^[A-Z]/.test(node.info):
                    cb(aux, node);
                    aux.children = [];
                    return aux;
            }//end of switch
        });
        return treejson;
    }; //end of jsonizeT       

    // sets a certain colour for the node with the specified id
    var colorize = function (nodeid, colour) {
        var d3node = d3.select(nodeid);
        var strokeColour, textColour;
        if (colour === "white") {
            strokeColour = "black";
            textColour = "black";
        } else {
            strokeColour = colour;
            textColour = "white";
        }
        d3node.select("circle")
            .transition()
            .duration(750)
            .style("fill", colour)
            .style("stroke", strokeColour);

        d3node.select(".tinfo")
            .transition()
            .duration(750)
            .style("fill", textColour);
    };
    
    // sets a certain position (initial, final or middle) for a node, according to the node identifier
    var position = function (nodenr) {
        if (nodenr === rytterTree.f) {
            return "f";
        } else if (nodenr === rytterTree.i) {
            return "i";
        } else {
            return "m";
        }
    };

    var postorder = function (tree, callback) {
            if(tree.left !== undefined) {
                postorder(tree.left, callback);
            }
            if (tree.right !== undefined){
                postorder(tree.right, callback);
            }
            callback(tree);
    };

    //verifies if a node exists in the nodes array
    var getNode = function (id, nodesArray) {
        var n = nodesArray.filter(function(node) {
            return node.id === id;
        });
        
        return n[0];
    };

        
    var getCurrentTreeNode = function (treeNodeId) {
        // currentTreeNode is in the form: #tnode+d.postid
        // only d.postid is needed, meaning substr(6)
        // var d_postid = currentTreeNode.substr(6);
        var d_postid = parseInt(treeNodeId.substr(6));
        
        //search in the tree the node with postid===d_postid 
        var d_elem = {};
        //gets the subtree with the root in d_elem
        postorder(rytterTree, function (elem) {
            if (elem.postid === d_postid) {
                d_elem = elem;}
            return d_elem;
        });
        return d_elem;
    };

    // adds nodes and edges to the NFA, acording to the 'next' button
    var addToNFA = function (d_elem, gnodes, glinks) {
        var n0, n1, n2, n3, n4, n5, n6;
        if (d_elem) {
            
            switch(true) {
                case /\|/.test(d_elem.info):
                case /\+/.test(d_elem.info):
                    n1 = getNode(d_elem.i, gnodes);
                    n2 = getNode(d_elem.f, gnodes);

                    if (n1 === undefined){ gnodes.push(n1 = {id: d_elem.i, label: d_elem.i, position: position(d_elem.i)});}
                    if (n2 === undefined){ gnodes.push(n2 = {id: d_elem.f, label: d_elem.f, position: position(d_elem.f)});}

                    if(d_elem.i === rytterTree.i) {
                        gnodes.push(n0 = {id: 0, label:"s", position:"s"});
                        glinks.push({source: n0, target: n1, label: ""});
                    }

                    n3 = getNode(d_elem.left.i, gnodes);
                    glinks.push({source: n1, target: n3, label: "\u03B5"});

                    n4 = getNode(d_elem.right.i, gnodes);
                    glinks.push({source: n1, target: n4, label: "\u03B5"});

                    n5 = getNode(d_elem.left.f, gnodes);
                    glinks.push({source: n5, target: n2, label: "\u03B5"});

                    n6 = getNode(d_elem.right.f, gnodes);
                    glinks.push({source: n6, target: n2, label: "\u03B5"});
                return;

                case /\./.test(d_elem.info) :
                    n1 = getNode(d_elem.left.f, gnodes);
                    n2 = getNode(d_elem.right.i, gnodes);
                    glinks.push({source: n1, target: n2, label: "\u03B5"});
                return;

                case /\*/.test(d_elem.info) :
                    n1 = getNode(d_elem.i, gnodes);
                    n2 = getNode(d_elem.f, gnodes);
                        
                    n3 = getNode(d_elem.left.i, gnodes);
                    n4 = getNode(d_elem.left.f, gnodes);
                   
                    if (n1 === undefined){ gnodes.push(n1 = {id: d_elem.i, label: d_elem.i, position: position(d_elem.i)});}
                    if (n2 === undefined){ gnodes.push(n2 = {id: d_elem.f, label: d_elem.f, position: position(d_elem.f)});}

                    if(d_elem.i === rytterTree.i) {
                        gnodes.push(n0 = {id: 0, label:"s", position:"s"});
                        glinks.push({source: n0, target: n1, label: ""});
                    }

                    glinks.push({source: n1, target: n2, label: "\u03B5"});
                    glinks.push({source: n1, target: n3, label: "\u03B5"});
                    glinks.push({source: n4, target: n3, label: "\u03B5"});
                    glinks.push({source: n4, target: n2, label: "\u03B5"});
                return;

                case /^[a-z]/.test(d_elem.info) :
                case /^[A-Z]/.test(d_elem.info) :
                        n0 = getNode(0, gnodes);
                        n1 = getNode(d_elem.i, gnodes);
                        n2 = getNode(d_elem.f, gnodes);
                   
                    if (n1 === undefined){ gnodes.push(n1 = {id: d_elem.i, label: d_elem.i, position: position(d_elem.i)});}
                    if (n2 === undefined){ gnodes.push(n2 = {id: d_elem.f, label: d_elem.f, position: position(d_elem.f)});}
                    
                    if(d_elem.i === rytterTree.i) {
                        gnodes.push(n0 = {id: 0, label:"s", position:"s"});
                        glinks.push({source: n0, target: n1, label: ""});
                    }
                    glinks.push({source: n1, target: n2, label: d_elem.info});
                return;
            }   
        }
        
    };

    // removes nodes and edges from NFA, according to the 'prev' button
    var removeFromNFA = function (d_elem, gnodes, glinks) {
        var n0, n1, n2, n3, n4, n5, n6;
        var linksToRemove=[], oldlink;
        if (d_elem) {
            //alert("d_elem "+JSON.stringify(d_elem));
            //alert("rytterTree " + JSON.stringify(d_elem));
            if (d_elem.info !== ".") {
                if(d_elem.i === rytterTree.i){
                        n0 = getNode(0, gnodes);
                        gnodes.splice(gnodes.indexOf(n0), 1);
                        oldlink = glinks.filter(function (link) {
                            return link.source.id === 0 && link.target.id === d_elem.i;
                        });
                }
                n1 = getNode(d_elem.i, gnodes);
                n2 = getNode(d_elem.f, gnodes);
                
                gnodes.splice(gnodes.indexOf(n1), 1);
                gnodes.splice(gnodes.indexOf(n2), 1);
            }

            switch(true) {
                case /\|/.test(d_elem.info):
                case /\+/.test(d_elem.info):                    
                    n3 = getNode(d_elem.left.i, gnodes);
                    n4 = getNode(d_elem.right.i, gnodes);
                    n5 = getNode(d_elem.left.f, gnodes);
                    n6 = getNode(d_elem.right.f, gnodes);
                    
                    linksToRemove = glinks.filter(function (link) {
                        return (link.source === n1 && link.target === n3) ||
                            (link.source === n1 && link.target === n4) ||
                            (link.source === n5 && link.target === n2) ||
                            (link.source === n6 && link.target === n2);

                    });
                    if(oldlink) {
                        linksToRemove.push(oldlink);}
                    linksToRemove.forEach(function (link) {
                        glinks.splice(glinks.indexOf(link), 1);
                   });
                return;

                case /\./.test(d_elem.info) :
                    oldlink = glinks.filter(function (link) {
                        return link.source.id === d_elem.left.f && link.target.id === d_elem.right.i;
                    });
                    glinks.splice(glinks.indexOf(oldlink), 1);

                return;

                case /\*/.test(d_elem.info) :
                    n3 = getNode(d_elem.left.i, gnodes);
                    n4 = getNode(d_elem.left.f, gnodes);
                    
                    linksToRemove = glinks.filter(function (link) {
                        return (link.source.id === n1.id && link.target.id === n2.id) ||
                            (link.source.id === n1.id && link.target.id === n3.id) ||
                            (link.source.id === n4.id && link.target.id === n3.id) ||
                            (link.source.id === n4.id && link.target.id === n2.id);
                    });
                    if(oldlink) {
                        linksToRemove.push(oldlink);}
                    linksToRemove.forEach(function (link) {
                        glinks.splice(glinks.indexOf(link), 1);
                    });
                return;

                case /^[a-z]/.test(d_elem.info) :
                case /^[A-Z]/.test(d_elem.info) : 
                    linksToRemove.push(glinks.filter(function (link) {
                            return link.source.id === d_elem.i && link.target.id === d_elem.f;
                        }));
                    if(oldlink) {
                        linksToRemove.push(oldlink);}
                    linksToRemove.forEach(function (link) {
                        glinks.splice(glinks.indexOf(link), 1);
                    });                 
                return;
            }   
        }
    };

    //firing all up
    var drawRytter = function() {
        //defining the tree SVG
        var click = 0,
            state_colour = "orange",
            treeSvgWidth = 450,
            treeSvgHeight = 450,
            treeSvgMargin = 50;

        var treeSvg = d3.select("#tree").append("svg")
                .attr({width: treeSvgWidth + treeSvgMargin,
                       height: treeSvgHeight + 2 * treeSvgMargin});
        

        var treeLayout = d3.layout.tree()
                        .size([treeSvgWidth, treeSvgHeight]);

        var diagonal = d3.svg.diagonal()
            .projection(function (d) {
                return [d.x, d.y];
            });
        
        var myjson = jsonizeT();
        var myjsonString = JSON.stringify(myjson);
        var root = JSON.parse(myjsonString);


        var drawTree = function() {
            var nodes = treeLayout.nodes(root);
            nodes.forEach(function (d) {
                d.y = d.depth * 90;
                });

            var links = treeLayout.links(nodes);
            
            var g = treeSvg.append("g")
                    .attr("id", "treeRoot")
                    .attr("transform", "translate(" + treeSvgMargin + ", " + treeSvgMargin + ")");
                
            var tlink = g.selectAll(".tlink")
                    .data(links)
                    .enter()
                    .append("path")
                    .attr("id",function (d) {
                        return "tnode" + d.source.postid + "->tnode" + d.target.postid})
                    .attr("class", "tlink")
                    .attr("d", diagonal);

            var tnode = g.selectAll(".tnode")
                    .data(nodes)
                    .enter()
                    .append("g")
                    .attr("class", "tnode")
                    .attr("id", function (d) {
                        return "tnode" + d.postid;
                    })
                    .attr("preid",function(d){return d.preid;})
                    .attr("transform", function (d) {
                        return "translate(" + d.x + "," + d.y + ")";});

            // appended to the classed ".tnode" group element
            tnode.append("circle")
                .attr("r", 20);
            tnode.append("text")
                .attr("class", "tinfo")
                .attr("dy", ".31em")
                .attr("text-anchor", function(d){return "middle";})
                .text(function(d){return d.info;});
            tnode.append("text")
                .attr("class", "tk")
                .attr("dx", "-1.5em")
                .attr("dy", "-1.1em")
                .attr("text-anchor", function(d){return "start";})
                .attr("fill-opacity", "0")
                .text(function(d){
                    if (d.k !== 0) {
                        return d.k;
                    }
                })
                .attr("display", "none");

            tnode.append("text")
                .attr("class", "tif")
                .attr("dx", "-2em")
                .attr("dy", "2.2em")
                .attr("text-anchor", function(d){return "start";})
                .attr("fill-opacity", "0")
                .text(function(d){
                    if (d.i !== 0 && d.f !== 0) {
                        return "(" + d.i + ",  " + d.f + ")";
                    }})
                .attr("fill", "blue")
                .attr("display", "none");
        };//end of function drawTree

        // defining the graph svg
        var widthNFA = 800,
            heightNFA = 550;

        var gnodes=[],
            glinks=[];
        
        var force = d3.layout.force()
            .nodes(gnodes)
            .links(glinks)
            .size([widthNFA, heightNFA])
            .linkDistance(70)//attraction between the connected nodes
            .charge(-300) //repulsion(<-negativ value) between nodes (if positive -> attraction) 
            .theta(0.1)
            .gravity(0.05)//pulls toward the layout center
            .on("tick", tick);

        var svgNFA = d3.select("#nfa").append("svg")
                .attr("width", widthNFA)
                .attr("height", heightNFA);

        var defsGroup = svgNFA.append("defs").append('marker')
                .attr({
                   'id':'bluearrowhead',
                   'viewBox':'0 -5 10 10',
                   'refX':37,
                   'refY':-1.5,
                   'orient':'auto',
                   'markerWidth':7,
                   'markerHeight':7,
                   'xoverflow':'visible'})
                .append('path')
                .attr("d", 'M 0,-5 L 10,0 L 0,5')
                .attr('fill', '#000');
                //.attr('stroke','blue');
        d3.select("defs").append('marker')
                .attr({
                   'id':'orangearrowhead',
                   'viewBox':'0 -5 10 10',
                   'refX':37,
                   'refY':-1.5,
                   'orient':'auto',
                   'markerWidth':7,
                   'markerHeight':7,
                   'xoverflow':'visible'})
                .append('path')
                .attr("d", 'M 0,-5 L 10,0 L 0,5')
                .attr('fill', 'orange');
                //.attr('stroke','orange');
        var link_update, linklabels_update, node_update, nodelabels_update;
        var glinkGroup = svgNFA.append("g").attr("class", "glinks");
        var glinklabelGroup = svgNFA.append("g").attr("class", "glinklabels");
        var gnodeGroup = svgNFA.append("g").attr("class", "gnodes");        
        var gnodelabelGroup = svgNFA.append("g").attr("class", "gnodelabels");

        var radius = 18.75;

        var drawNFA = function()  {
            var t = d3.transition().duration(500);
            //update links
            link_update = glinkGroup.selectAll(".glink").data(
                force.links(),
                function(d) {
                    return d.source.id + "->" + d.target.id;}
                );

            link_update.exit().transition(t)
                .attr("stroke-opacity", 0)
                .attrTween("x1", function(d) { return function() { return d.source.x; }; })
                .attrTween("x2", function(d) { return function() { return d.target.x; }; })
                .attrTween("y1", function(d) { return function() { return d.source.y; }; })
                .attrTween("y2", function(d) { return function() { return d.target.y; }; })
                .remove();

            link_update
                .transition(t)
                    .attr({
                        "stroke": "#000",
                        "marker-end": "url(#bluearrowhead)"});

            link_update.enter()
                .insert("path", ".gnode")
                .attr({
                    "class": "glink",
                    "fill": "none",
                    "stroke": state_colour,
                    "id": function (d) { return d.source.id + "->" + d.target.id; }
                })
                .style("pointer-events", "none")
                .transition(t)
                    .attr("marker-end", "url(#orangearrowhead)");
                
            //update link labels
            linklabels_update = glinklabelGroup.selectAll(".glinklabel")
                .data(
                force.links(), 
                function(d) { 
                    return  d.source.id + "->" + d.target.id;
                });

            linklabels_update.exit()
                .transition(t)
                .remove();

            linklabels_update.selectAll("textPath")
                .transition(t)
                    .style("fill", "#000");

            linklabels_update.enter()
                .append("text")
                .style("pointer-events", "none")
                .attr({
                    "class": "glinklabel",
                    "id": function (d) {return d.source.id + "->" + d.target.id;},
                    "dx": 40,
                    "dy": 15,
                    "font-size": 15})
                .append("textPath")
                .attr("xlink:href", function (d) {return "#" + d.source.id + "->" + d.target.id;})
                .style("pointer-events", "none")
                .text(function (d) {
                    return d.label;
                })
                .transition(t)
                    .style("fill", state_colour);
            
            //update nodes
            node_update = gnodeGroup.selectAll(".gnode").data(
                force.nodes(), 
                function(d) {return d.id;})
                .call(force.drag);

            node_update.exit()
                .transition(t)
                .attr("r", 0)
                .remove();  
            
            node_update
                .transition(t)
                .style("fill", "#fff")
                .style("stroke", "#000");

            node_update.enter()
                .append("circle")
                .attr("class", "gnode")
                .attr("id", function (d) {
                    return d.id;
                })
                .attr("r", function(d) {
                    if (d.position === "s") {
                        return radius - 13.75;
                    } else if (d.position ==="f"){
                        return radius + 1.25;
                    } else {
                        return radius - .75;
                    }
                })
                .style("fill", "#fff")
                //.style("stroke", "#000")
                .style("stroke-width", function(d) {
                    if (d.position === "s") { 
                        return '0.5';
                    } else if (d.position ==="f"){
                        return '3';
                    } else {
                        return '1';
                    }

                })
                .transition(t)
                .style("fill", state_colour);
                //.style("stroke", "#fff");
            
            // update node labels
            nodelabels_update = gnodelabelGroup.selectAll(".gnodelabel").data(
                force.nodes(), 
                function(d) {return d.id;});
            
            nodelabels_update.exit()
                .transition(t)
                .remove();

            nodelabels_update
                .transition(t)
                .style("fill", "#000");

            nodelabels_update.enter()
                .append("text")
                .attr({ 
                        "class": "gnodelabel",
                        "id": function(d) {return d.id;},
                        "fill-opacity": 1
                    })
                .text(function(d){return d.label;})
                .transition(t)
                .style("fill", "#fff");
            
            force.start();
            
        } // end of drawNFA function

        function tick  () {
            node_update
                    .attr("cx", function(d) {
                        return d.x = Math.max(radius, Math.min(widthNFA - radius, d.x));})
                    .attr("cy", function(d) {
                        return d.y = Math.max(radius, Math.min(heightNFA - radius, d.y));});
            
            nodelabels_update
                    .attr({"x": function(d){return d.x-5;},
                            "y": function(d){return d.y+5;}
                        });
           
            link_update
                    .attr('d', function (d) {
                    //alert(": d.source :" + JSON.stringify(d.source));
                    
                        var  olink = glinks.filter(function(elem){
                                if (elem.target.id === d.source.id && elem.source.id === d.target.id) {
                                    return elem;
                                }});
                        var x1 = d.source.x;
                        var x2 = d.target.x;
                        var y1 = d.source.y;
                        var y2 = d.target.y;
                        var dx = x2 - x1;
                        var dy = y2 - y1;
                        var dr = (olink.length > 0) ? Math.sqrt(dx * dx + dy * dy) : 0;
                        var path;
                        path  = "M " + x1 + ", " + y1;  
                        path += " A" + dr + ", " + dr + " 0 0,1 ";
                        path += x2 + ", " + y2;

                        return path;
                });

            linklabels_update
                    .attr("transform", function (d, i) {
                if (d.target.x < d.source.x) {
                    var bbox = this.getBBox();
                    var rx = bbox.x + bbox.width/2;
                    var ry = bbox.y + bbox.height/2;
                    return "rotate(180 " + rx + " " + ry + ")";
                } else {
                    return "rotate(0)";
                }});            
        } // end of tick function

    
    // ************* EXECUTE *************
        drawTree();

        d3.select('#nextbtn')
            .on("click", function () {                
                var len = rytterTree.length;                
                var currentid, nextid, currentTreeNode;
                d3.select("#prevbtn").attr("disabled", null);

                //goes from click=0 so that I can keep track of the previous id
                if (0 <= click && click <= len){
                    currentid= "g[preid=\""+click+"\"]";
                    colorize(currentid, "white");
                    click += 1;
                    //use of attribute css selector: htmlelem[attribute="value"]
                    nextid = "g[preid=\""+click+"\"]";
                    colorize(nextid, "red");
                    d3.select(nextid).select(".tk")
                    .transition()
                    .duration(750)
                    .attr("display", null)
                    .attr("fill", "red")
                    .attr("fill-opacity", "1");
                    
                    //in the last step click=nextid=len+1
                    //meaning that the current node now 
                    //is the first node from the next tree traversal
                    //so it has to be state_colour = "orange"
                    if (click === len+1) {
                        nextid = "#tnode"+click%len;
                        if (len === 1) {
                            nextid = "#tnode" + len;
                        }
                        colorize(nextid, state_colour);
                        d3.select(nextid).select(".tif")
                        .transition()
                        .duration(750)
                        .attr("display", null)
                        .attr("fill", state_colour)
                        .attr("fill-opacity", "1");
                    }

                } else if (len < click && click <= 2*len) {
                    currentid = "#tnode"+click%len;
                    if (len === 1) {
                        currentid = "#tnode" + len;
                    }
                    colorize(currentid, "white");
                    click += 1;
                    if (click < 2*len)  {
                        //use of attribute css selector: htmlelem[attribute="value"]
                        nextid = "#tnode"+click%len;
                    } 
                    if (click === 2*len) {
                        nextid = "#tnode"+len;
                    }
                    colorize(nextid, state_colour);
                    d3.select(nextid)
                        .select(".tif")
                        .transition()
                        .duration(750)
                        .attr("display", null)
                        .attr("fill", state_colour)
                        .attr("fill-opacity", "1");
                    if (click === 2*len+1) {
                        // call the addToNFA function for the first tree node of the next traversal
                        currentid = "#tnode"+len;
                        colorize(currentid, "white");
                        if (len === 1) {
                            nextid = "#tnode"+len;
                        } else {
                            nextid = "#tnode"+click%len;
                        }
                        colorize(nextid, "blue");
                        currentTreeNode = getCurrentTreeNode(nextid);
                        addToNFA(currentTreeNode, gnodes, glinks);
                        force.nodes(gnodes);
                        force.links(glinks);
                        drawNFA();
                    }
                } else if (2*len < click && click <= 3*len) {
                    currentid= "#tnode"+click%len;
                    colorize(currentid, "white");
                    click += 1;
                    if (click < 3*len)  {
                        nextid = "#tnode"+click%len;//use of attribute css selector: htmlelem[attribute="value"]
                    }
                    if (click === 3*len) {
                        nextid = "#tnode"+len;
                    }
                    colorize(nextid, "blue");
                    // call the addToNFA function
                    if (click === 3*len + 1) {
                        currentid = "#tnode"+len; //the last node in the last tree traversal
                        colorize(currentid, "white");
                        nextid = "#tnode0";//nextid does not exist anymore
                        d3.select('#nextbtn')
                        .attr("disabled", "disabled"); // there is no going forward; only going back is possible
                        document.getElementById("prevbtn").focus();
                    }
                    if (nextid !== "#tnode0"){
                        currentTreeNode = getCurrentTreeNode(nextid);
                        force.stop();
                        addToNFA(currentTreeNode, gnodes, glinks);
                        
                    }
                    force.nodes(gnodes);
                        force.links(glinks);
                        force.start();
                    drawNFA();
                
                } else {click += 1;}
            });//end of next button listener

        d3.select("#prevbtn")
            .on("click", function () {

                var currentid, previd, currentTreeNode;
                var len = rytterTree.length;

             
                if (click > 0 && click <= len) { 
                    currentid = "g[preid=\"" + click + "\"]";
                    click -= 1;
                    if (click === 0) {
                        d3.select("#nextbtn").attr("disabled", null);
                        document.getElementById("nextbtn").focus();
                        d3.select('#prevbtn').attr("disabled", "disabled");
                    }
                    previd = "g[preid=\"" + click + "\"]";//use of attribute css selector: htmlelem[attribute="value"]                    
                    colorize(currentid, "white");
                    d3.select(currentid).select(".tk")
                        .transition()
                        .duration(750)
                        .attr("display", "none")
                        .attr("fill-opacity", "0");
                    colorize(previd, "red");
                } else  if (click > len && click <= 2*len) {
                    if (click == 2*len) {
                        currentid = "#tnode"+len; 
                    } else{
                        currentid = "#tnode"+click%len;
                    }
                    click -= 1;
                    if (click == len) {
                        previd = "g[preid=\"" + click + "\"]";
                        colorize(previd, "red");
                    } else {
                        previd = "#tnode"+click%len;
                        colorize(previd, state_colour);
                    }
                    colorize(currentid, "white");
                    d3.select(currentid).select(".tif")
                        .transition()
                        .duration(750)
                        .attr("display", "none")
                        .attr("fill-opacity", "0");

                    
                } else if (2*len < click && click <= 3*len + 1) {
                    //alert("click prev" + click);
                    d3.select("#nextbtn").attr("disabled", null);
                     if (click === 3*len + 1) {
                        currentid = "#tnode0";
                        previd = "#tnode" + len;
                        colorize(previd, "blue");
                    } else if(click === 3*len) {
                        currentid = "#tnode" + len;
                        colorize(currentid, "blue");
                        currentTreeNode = getCurrentTreeNode(currentid);
                        force.stop();
                        removeFromNFA(currentTreeNode, gnodes, glinks);
                        force.nodes(gnodes);
                        force.links(glinks);
                        force.start();
                        drawNFA();
                    } else {
                        currentid = "#tnode" + click%len;
                        currentTreeNode = getCurrentTreeNode(currentid);
                        force.stop();
                        removeFromNFA(currentTreeNode, gnodes, glinks);
                        force.nodes(gnodes);
                        force.links(glinks);
                        force.start();
                        drawNFA();
                    }
                    click -= 1;
                    previd = "#tnode" + click%len;
                    if (click > 2*len) {
                        colorize(previd, "blue");
                    } else if(click === 2*len){
                        previd = "#tnode" + len;
                        colorize(previd, state_colour);
                    }
                    colorize(currentid, "white");
                    
                } else {click -= 1;}
            });//end of prev button listener

    }; //end of drawRytter

	return Object.freeze({
			rytterize: rytterize,
            drawRytter: drawRytter
	});
}());