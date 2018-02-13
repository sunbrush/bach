var REFINER = function () {
    'use strict';
	var input,
	    parseTree={};
    
    //private functions that have acces to the private properties
    var init = function () {
        input = document.getElementById("rex").value;
        return input;
    };

    var preorder = function (some_tree, callback) {
        var aux_tree = {};
        aux_tree = callback(some_tree);
        var left, right;
        if (some_tree.left !== undefined) {
            left = preorder(some_tree.left, callback);
            if (left !== undefined) {
                aux_tree.left = left;
            }
        }
        if (some_tree.right !== undefined){
            right = preorder(some_tree.right, callback);
            if ( right !== undefined) {
                aux_tree.right = right;    
            }
        }
        return aux_tree;
    };

    var postorder = function (some_tree, callback) {
        var aux_tree = {};
        
        if(some_tree.left !== undefined) {
           aux_tree.left = postorder(some_tree.left, callback);
        }
        if (some_tree.right !== undefined){
            aux_tree.right = postorder(some_tree.right, callback);
        }
        aux_tree = callback(some_tree);
        
        return aux_tree;
    };


    var getParseTree = function () {
        if (input !== "" && input !== undefined) {
            parseTree = REFINER.parse(input);
            parseTree = preorder(parseTree, function (elem) {
                if ((/^[a-z]/.test(elem) || /^[A-Z]/.test(elem)) && typeof(elem) === "string") {
                    elem = {
                        info : elem
                    };
                } 
                return elem;
            });
            return parseTree;
        }
    };

   var jsonize = function(){
    //transforms the parseTree into an object with the arrays nodes and links as members
        var treejson = {
            nodes:[], 
            links:[]
        };
  
        var callback = function(array, node) {
            array.push(node);
        };

        var preorderj = function(node, cb){
            cb(treejson.nodes, node);
            if (node.left !== undefined) {
                cb(treejson.links, {"source":node.n, "target": node.left.n});
                preorderj(node.left, cb);
                if (node.right !== undefined) {
                    cb(treejson.links, {"source":node.n, "target": node.right.n});
                    preorderj(node.right,cb);      
                } 
            } else {
                if (node.right !== undefined) {
                    cb(treejson.links, {"source" :  node.n, "target" : node.right.n})
                    preorderj(node.right,cb); 
                } 
            }
        };
      
        preorderj(parseTree, callback);
        return treejson;
   };


    return Object.freeze({
        focusRex: REFINER.main.focusRex,
        startListener: REFINER.main.startListener,
        prevListener: REFINER.main.prevListener,
        nextListener: REFINER.main.nextListener,
        nextRListener: REFINER.main.nextRListener,
    	init : init,
        getParseTree: getParseTree,
        parse: REFINER.parser.parse,
        preorder: preorder,
        postorder: postorder,
        rytterize: REFINER.rytter.rytterize,
        d3DrawRytter: REFINER.rytter.drawRytter
    });
} ();