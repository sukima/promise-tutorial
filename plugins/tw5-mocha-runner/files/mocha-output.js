/*\
title: $:/plugins/sukima/tw5-mocha-runner/mocha-output.js
type: application/javascript
module-type: widget

Run the specs and output the result
\*/

/*jslint node: true, browser: true */
/*global $tw: false */
(function() {
'use strict';

// This is a browser only script. Bail out on node.
if (!$tw.browser) { return; }

var Widget = require('$:/core/modules/widgets/widget.js').widget;

// #mocha needs to be a static varibable that is reusable. Even though it gets
// appended and removed as the widget is shown. Also outside the confines of an
// instance we should not depend on $tw.utils.domMaker at this scope.
var mochaDomNode = document.createElement('div');
mochaDomNode.setAttribute('id', 'mocha');
mochaDomNode.appendChild(
  document.createTextNode('Select an example to run the specs.')
);

function mochaIsDetached() {
  return (document.getElementById('mocha') == null);
}

var MochaOutputWidget = function(parseTreeNode, options) {
  this.initialise(parseTreeNode, options);
};

MochaOutputWidget.prototype = new Widget();

MochaOutputWidget.prototype.render = function(parent, nextSibling) {
  this.parentDomNode = parent;
  this.computeAttributes();
  if (mochaIsDetached()) {
    parent.appendChild(mochaDomNode);
    this.domNodes.push(mochaDomNode);
  }
};

MochaOutputWidget.prototype.refresh = function(changedTiddlers) {
  return false;
};

exports['mocha-output'] = MochaOutputWidget;

})();
