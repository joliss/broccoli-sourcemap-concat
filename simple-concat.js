var CachingWriter = require('broccoli-caching-writer');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var helpers = require('broccoli-kitchen-sink-helpers');

function Combined() {
  this._internal = '';
}

Combined.prototype.append = function(string) {
  this._internal += string;
};

Combined.prototype.valueOf = function() {
  return this._internal;
};

Combined.prototype.toString = function() {
  return this._internal;
};

module.exports = SimpleConcat;
SimpleConcat.prototype = Object.create(CachingWriter.prototype);
SimpleConcat.prototype.constructor = SimpleConcat;
function SimpleConcat(inputNode, options) {
  if (!(this instanceof SimpleConcat)) return new SimpleConcat(inputNode, options);
  if (!options || !options.outputFile || !options.inputFiles) {
    throw new Error('inputFiles and outputFile options ware required');
  }

  CachingWriter.call(this, [inputNode], {
    inputFiles: options.inputFiles,
    annotation: options.annotation
  });

  this.inputFiles = options.inputFiles;
  this.outputFile = options.outputFile;
  this.allowNone = options.allowNone;
  this.header = options.header;
  this.headerFiles = options.headerFiles;
  this.footer = options.footer;
  this.footerFiles = options.footerFiles;
  this.separator = (options.separator != null) ? options.separator : '\n';
}

SimpleConcat.prototype.build = function() {
  var combined = new Combined();
  var firstSection = true;
  var separator = this.separator;

  function beginSection() {
    if (firstSection) {
      firstSection = false;
    } else {
      combined.append(separator);
    }
  }

  if (this.header) {
    beginSection();
    combined.append(this.header);
  }

  if (this.headerFiles) {
    this.headerFiles.forEach(function(file) {
      beginSection();
      combined.append(fs.readFileSync(path.join(this.inputPaths[0], file), 'UTF-8'));
    });
  }

  try {
    this._addFiles(combined, this.inputPaths[0], beginSection);
  } catch(error) {
    // multiGlob is obtuse.
    if (!error.message.match('did not match any files') || !this.allowNone) {
      throw error;
    }
  }

  if (this.footer) {
    beginSection();
    combined.append(this.footer);
  }

  if (this.footerFiles) {
    this.footerFiles.forEach(function(file) {
      beginSection();
      combined.append(fs.readFileSync(path.join(this.inputPaths[0], file), 'UTF-8'));
    }.bind(this));
  }

  var filePath = path.join(this.outputPath, this.outputFile);

  mkdirp.sync(path.dirname(filePath));

  if (firstSection) {
    combined.append('');
  }

  fs.writeFileSync(filePath, combined);
}

SimpleConcat.prototype._addFiles = function(combined, inputPath, beginSection) {
  helpers.multiGlob(this.inputFiles, {
    cwd: inputPath,
    root: inputPath,
    nomount: false
  }).forEach(function(file) {
    var filePath = path.join(inputPath, file);
    var stat;

    try {
      stat = fs.statSync(filePath);
    } catch(err) {}

    if (stat && !stat.isDirectory()) {
      beginSection();
      combined.append(fs.readFileSync(filePath, 'UTF-8'));
    }
  });

  return combined;
}
