Less 2.5.0 Compiler for Komdo Edit/Ide
=========================

a LESS 2.5.0 compiler for Komodo Edit/Ide.  
Based on the old  [LESS](https://community.activestate.com/node/7416) compiler (with version 1.2.1), its updated to work with the (latest) LESS 2.5.0 version.
A bug with the @import is now fixed (is handled by the extension it self), and a file watcher ability was added.

<h2>Use</h2>
<p>Goto to Tools -&gt; LESS and select an option.</p>
<ul>
<li><strong><em>Compile Saved File into CSS</em></strong><br>
takes a .less file and creates a .css file with the same name in the same spot as the .less file.</li>
<li><strong><em>Compile Current Buffer</em></strong><br>
into CSS takes the contents of the current buffer and turns it into CSS.</li>
<li><strong><em>Compile Selection into CSS</em></strong><br> 
takes the current selection and turns it into CSS.</li>
<li><strong><em>Compile and Compress Saved File into CSS</em></strong><br>
takes a .less file and creates a .css file with the same name in the same spot as the .less file. The .less file will be compressed/minified.</li>
<li><strong><em>Compile and Compress Current Buffer</em></strong><br>
into CSS takes the contents of the current buffer and turns it into compressed CSS.</li>
<li><strong><em>Compile and Compress Selection into CSS</em></strong><br> 
takes the current selection and turns it into compressed CSS.</li>
</ul>
<em>When you right-click on the file you get the same option list (LESS > options).</em>


<h2>Macro</h2>
<p>You can create a macro that will automatically turn a .less file into CSS when you save. Use the following code and have it trigger After file save:</p>
```javascript
if (extensions.less) {
	extensions.less.compileFile();
}
```
<p>The following macro will compile and compress the css.</p>
```javascript
if (extensions.less) {
	extensions.less.compileCompressFile();
}
```
<p>The following macro will compile the predefined file (file watcher) when editing LESS files.</p>
```javascript
if (extensions.less) {
	var file = 'ftp://path/to/file.less';
	extensions.less.watchFile(file);
}
```
 