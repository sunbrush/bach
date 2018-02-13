var REFINER = REFINER || {};

REFINER.main = (function () {
    'use strict';

	var focusRex = function () {
		document.getElementById("rex").value = "";
		document.getElementById("rex").focus();
	};

    // the handler for the start button
    var startListener = function () {
    	if ( document.getElementById("rex").value === "" ){
            document.getElementById("rex").value = "Hi! I need a regular "+
            "expression...";
            document.getElementById("rex").focus();
        } else {
                document.getElementById("tree").innerHTML = "";
                document.getElementById("nfa").innerHTML = "";
        	try {
        		//read the input
        		var rex = REFINER.init();
        		//call rytter's algorithm
        		REFINER.rytterize();
        		//draw and animate the parse tree and the obtained nfa
        		REFINER.d3DrawRytter();
        		//make the navigation buttons accessible
                document.getElementById("prevbtn").style.visibility = 'visible';
                document.getElementById("nextbtn").style.visibility = 'visible';
                
                document.getElementById("nextbtn").focus();

                d3.select("#nextbtn").attr("disabled", null);
                        document.getElementById("nextbtn").focus();
                  
        	} catch (err) {
        		document.getElementById("rex").value = "Hi! Something went wrong: " + JSON.stringify(err.message);
        	}
        }
    };

    return Object.freeze({
    	focusRex: focusRex,
    	startListener: startListener,
    	
    });
}());