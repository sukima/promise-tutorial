/*\
title: $:/plugins/sukima/tw5-mocha-runner/mocha-specs.js
type: application/javascript
module-type: widget

Display code and run it in the spec runner
\*/

/*jslint node: true, browser: true */
/*global $tw: false */
(function() {
'use strict';

// This is a browser only script. Bail out on node.
if (!$tw.browser) { return; }

var mocha = require('$:/plugins/sukima/tw5-mocha-runner/mocha.js');
var chai = require('$:/plugins/sukima/tw5-mocha-runner/chai.js');
var Widget = require('$:/core/modules/widgets/widget.js').widget;
var outputTiddlerTitle = '$:/plugins/sukima/tw5-mocha-runner/Output';
var hljs;

try {
  hljs = require('$:/plugins/tiddlywiki/highlight/registerlanguages.js').hljs;
} catch (e) {
  hljs = null;
}

mocha.setup('bdd');

function prepareCode(code) {
  return (
    'var mocha = this.mocha, chai = this.chai, expect = this.chai.expect;' +
    code
  );
}

var MochaSpecWidget = function(parseTreeNode, options) {
  this.initialise(parseTreeNode, options);
};

MochaSpecWidget.prototype = new Widget();

MochaSpecWidget.prototype.render = function(parent, nextSibling) {
  this.parentDomNode = parent;
  this.computeAttributes();
  this.execute();
  var domNode = document.createElement('div');
  domNode.appendChild(this.makeButtonBar());
  if (this.code && !this.hasAttribute('hide')) {
    domNode.appendChild(this.makeCodeNode(this.source));
  } else if (!this.code) {
    domNode.appendChild(this.makeErrorNode());
  }
  parent.appendChild(domNode);
  this.domNodes.push(domNode);
};

MochaSpecWidget.prototype.makeCodeNode = function(source) {
  var pre = document.createElement('pre');
  var code = document.createElement('code');
  $tw.utils.addClass(code, 'javascript');
  code.appendChild(document.createTextNode(source));
  pre.appendChild(code);
  if (hljs) {
    hljs.highlightBlock(pre);
  }
  return pre;
};

MochaSpecWidget.prototype.makeButtonBar = function() {
  var domNode, openButton;
  openButton = this.hasAttribute('hide') ? 'View Code' : 'Edit Code';
  domNode = document.createElement('div');
  if (this.code) {
    domNode.appendChild(
      this.makeButton('Run Specs', 'click', 'handleRunSpecs')
    );
  }
  domNode.appendChild(this.makeButton(openButton, 'click', 'handleViewCode'));
  return domNode;
};

MochaSpecWidget.prototype.makeButton = function(title, event, method) {
  var button = document.createElement('button');
  button.appendChild(document.createTextNode(title));
  $tw.utils.addEventListeners(button, [
    {name: event, handlerObject: this, handlerMethod: method}
  ]);
  return button;
};

MochaSpecWidget.prototype.makeErrorNode = function(error) {
  var message = document.createElement('div');
  $tw.utils.addClass(message, 'tc-error');
  message.appendChild(document.createTextNode(error));
  return message;
};

MochaSpecWidget.prototype.execute = function() {
  var tiddler, sourceCode;
  this.tiddlerTitle = this.getAttribute('tiddler');
  tiddler = this.wiki.getTiddler(this.tiddlerTitle);
  if (!tiddler) {
    this.source = 'Unable to load target tiddler ' + this.tiddlerTitle;
    this.code = null;
  } else if (tiddler.getFieldString('type') !== 'application/javascript') {
    this.source = 'Tiddler does not have a type of application/javascript';
    this.code = null;
  } else {
    this.source = tiddler.getFieldString('text');
    this.code = this.makeCode();
  }
};

MochaSpecWidget.prototype.makeCode = function() {
  // jshint evil:true
  return new Function(prepareCode(this.source));
};

MochaSpecWidget.prototype.handleViewCode = function() {
  var tiddler = this.getAttribute('tiddler');
  var bounds = this.parentDomNode.getBoundingClientRect();
  this.dispatchEvent({
    type: 'tm-navigate',
    navigateTo: tiddler,
    navigateFromTitle: this.getVariable('storyTiddler'),
    navigateFromNode: this.parentDomNode,
    navigateFromClientRect: bounds,
    navigateSuppressNavigation: false
  });
};

MochaSpecWidget.prototype.handleRunSpecs = function() {
  var sideBarStateTiddler =
    $tw.wiki.filterTiddlers('[prefix[$:/state/tab/sidebar]]')[0];
  if (sideBarStateTiddler) {
    $tw.wiki.setTextReference(sideBarStateTiddler, outputTiddlerTitle);
  }
  $tw.wiki.setTextReference('$:/temp/search', '');
  $tw.utils.nextTick(this.runSpecs.bind(this));
};

MochaSpecWidget.prototype.runSpecs = function() {
  var output = document.getElementById('mocha');
  if (!output) {
    console.error('Missing #mocha div. Can not run specs.');
    return;
  }

  function finishedRunning() {
    var badLinks = output.querySelectorAll('.suite a');
    $tw.utils.each(badLinks, function(link) {
      var linkContent = link.innerHTML;
      if ($tw.utils.hasClass(link, 'replay')) {
        link.remove();
      } else {
        link.parentNode.innerHTML = linkContent;
      }
    });
  }

  output.innerHTML = '';
  output.className = '';
  mocha.suite.suites = [];
  try {
    this.code.call({mocha: mocha, chai: chai});
    mocha.run(finishedRunning);
  } catch (e) {
    console.error(e);
    output.appendChild(this.makeErrorNode(e.toString()));
  }
};

MochaSpecWidget.prototype.refresh = function(changedTiddlers) {
  if (changedTiddlers[this.tiddlerTitle] != null) {
    this.refreshSelf();
    return true;
  }
  return false;
};

exports['mocha-specs'] = MochaSpecWidget;

})();
