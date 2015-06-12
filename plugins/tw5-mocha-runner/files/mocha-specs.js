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
// var ButtonWidget = require('$:/core/modules/widgets/button.js').button;
var outputTiddlerTitle = '$:/plugins/sukima/tw5-mocha-runner/Output';

mocha.setup('bdd');

function prepareCode(code) {
  var preamble = $tw.wiki.getTiddlerText(
    '$:/plugins/sukima/tw5-mocha-runner/preamble.js'
  );
  return (
    ';' +
    (preamble ? preamble + ';' : '') +
    ($tw.utils.isArray(code) ? code.join(';') : code)
  );
}

function specsDoneFor(output) {
  return function specsDone() {
    var badLinks = output.querySelectorAll('.suite a');
    $tw.utils.each(badLinks, function(link) {
      var linkContent = link.innerHTML;
      if ($tw.utils.hasClass(link, 'replay')) {
        link.remove();
      } else {
        link.parentNode.innerHTML = linkContent;
      }
    });
    badLinks = output.getElementsByTagName('a');
    $tw.utils.each(badLinks, function(link) {
      link.removeAttribute('href');
    });
  };
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
  if (this.error) {
    domNode.appendChild(this.makeErrorNode(this.error));
  }
  parent.appendChild(domNode);
  this.domNodes.push(domNode);
};

MochaSpecWidget.prototype.makeButtonBar = function() {
  var domNode = document.createElement('div');
  if (!this.error) {
    domNode.appendChild(
      this.makeButton('Run Specs', 'click', 'handleRunSpecs')
    );
  }
  domNode.appendChild(this.makeButton('Edit Code', 'click', 'handleViewCode'));
  return domNode;
};

MochaSpecWidget.prototype.makeButton = function(title, event, method) {
  return $tw.utils.domMaker('button', {
    text: title,
    eventListeners: [
      {name: event, handlerObject: this, handlerMethod: method}
    ]
  });
};

MochaSpecWidget.prototype.makeErrorNode = function(error) {
  return $tw.utils.domMaker('div', {'class': 'tc-error', text: error});
};

MochaSpecWidget.prototype.setErrorState = function(error) {
  this.code = null;
  this.source = null;
  this.error = error ?
    error.replace('${filter}', this.getAttribute('filter')) :
    null;
};

MochaSpecWidget.prototype.execute = function() {
  var sourceCode;

  if (!this.hasAttribute('filter')) {
    this.setErrorState('The mocha-specs widget requires a filter attribute.');
    return;
  }

  this.filter = this.getAttribute('filter') +
    ' +[field:type[application/javascript]]';

  this.codeTiddlers = this.wiki.filterTiddlers(this.filter);

  if (this.codeTiddlers.length === 0) {
    this.setErrorState(
      'No application/javascript tiddlers found matching filter "${filter}"'
    );
    return;
  }

  sourceCode = '';
  $tw.utils.each(this.codeTiddlers, function(tiddler) {
    sourceCode += $tw.wiki.getTiddlerText(tiddler);
  });

  this.setErrorState();
  this.source = sourceCode;
  this.code = this.makeSpecFunc(sourceCode);
};

MochaSpecWidget.prototype.makeSpecFunc = function(sourceCode) {
  // jshint evil:true
  try {
    return new Function(prepareCode(sourceCode));
  } catch (e) {
    console.error(e);
    this.setErrorState(e.toString());
  }
};

MochaSpecWidget.prototype.refresh = function(changedTiddlers) {
  this.computeAttributes();
  this.execute();
  var needsRefresh = false;
  $tw.utils.each(this.codeTiddlers, function(title) {
    if ($tw.utils.hop(changedTiddlers, title)) {
      needsRefresh = true;
      return false;
    }
  });
  return needsRefresh;
};

MochaSpecWidget.prototype.handleViewCode = function() {
  $tw.wiki.setTextReference(
    '$:/temp/codetiddlers',
    this.codeTiddlers.join(' ')
  );
  var bounds = this.parentDomNode.getBoundingClientRect();
  this.dispatchEvent({
    type: 'tm-navigate',
    navigateTo: '$:/CodeTiddlers',
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

  output.innerHTML = '';
  output.className = '';
  mocha.suite.suites = [];

  try {
    this.code.call({mocha: mocha, chai: chai});
    mocha.run(specsDoneFor(output));
  } catch (e) {
    console.error(e);
    output.appendChild(this.makeErrorNode(e.toString()));
  }
};

exports['mocha-specs'] = MochaSpecWidget;

})();
