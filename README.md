# Refiner

### Files Within Refiner Project:

 - index.html    - the interface with the user; 
 - refiner.js    - the description of the object that contains the hole project; 
 - main.js       - the file containing the event handlers; 
 - parser.js     - the parser generated with PEGjs online library, using the grammar described in pegjs_grammar; 
 - rytter.js     - the implementation of the Rytter algorithm of transforming regular expression to nondeterministic finite automaton, and the construction of its animaton with D3.js; 
 - pegjs_grammar - the grammar used by PEGjs to generate the parser; 
 - refiner.css   - the style applied to index.html; 
 - Readme.md        - the current file; 

### How to generate the parser from the grammar:
 1. Open the pegjs_grammar file and copy the grammar 
 2. Open the page http://pegjs.org/online and paste the grammar to 
    the left text area, marked with: "1. Write your PEG.js grammar"
 3. On the page http://pegjs.org/online, in the right down section 
    "3. Download the parser code", complete the "Parser variable" field with:
    REFINER.parser
 4. Press the "Download parser" button.
 5. Save the parser.js file to the Refiner project directory


### How To Run Refiner:

 1. Open the index.html file with a browser.
 2. In the regular expression field, enter a valid regular
    expression.
 3. Press the "start" button. In the large text area appears the visualization of the expression's parse tree.
 4. Click the next or prev button and thus navigate through the steps of Rytter's algorithm. The nodes will be annotated with consecutive k(except the concatenation nodes) in preorder, then with states pairs (i, f) in postorder, and finally the nfa will be created.
