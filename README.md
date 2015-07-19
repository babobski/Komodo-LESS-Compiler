Less Compiler for Komodo Edit/Ide
=========================

a LESS 2.5.1 compiler for Komodo Edit/Ide.  
Based on the old  [LESS](https://community.activestate.com/node/7416) compiler (with LESS version 1.2.1), its updated to work with the (latest) LESS 2.5.1 version.
A bug with the @import is now fixed (is handled by the extension it self. A function to compile only one file while editing less files is added
and you can set up auto completion for your Less @vars.

<h2>Usage</h2>
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
<li><strong><em>Collect @vars</em></strong><br> 
collect all the LESS @vars for auto completion.</li>
<li><strong>File Watcher</strong><ul>
<li>
<strong>Enable File Watcher for current file</strong><br>
Enables a file watcher for current LESS file
</li>
<li>
<strong>disable File Watcher</strong><br>
Disables the file watcher
</li>
</ul>
</ul>
<em>When you right-click on the file you get the same option list (LESS > options).</em>


<h2>Macro's</h2>
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

<h2>@vars completion</h2>
<p>This extension also includes a @var auto completion for a better LESS integration in Komodo.<br>
This completion box is triggered when you type <code>@</code>, if you are at the start of the line a default box will be displayed with <code>@import, @media, @font-face, @key-frame, @-webkit-key-frame</code></p>
<p>To set up the auto completion you will have to set 2 marco's the first one is to enable the completion, and the other to get the @vars from your document.<br>
A known <b>bug</b> is that after insertion white space is added, i created a "fix" if you type <code>;</code> or <code>)</code> the white space is removed and if there is a additional <code>;</code> or <code>)</code> it will be removed (for or Emmet users).</p>
<p>The following marco will trigger a custom auto completion box with LESS @vars (trigger after start up).  
</p>

```javascript
if (extensions.less) {
    extensions.less.varCompletion();
}
 ```
 <p>The next marco is for getting the @vars form your document (current view or the file where the file watcher is enabled including @imports) (trigger on custom key binding, i use <kbd>Alt</kbd> + <kbd>g</kbd>)<br>
 if you working with LESS and you have not search for @vars and you trigger the completion (by typing @ not on the beginning of a line) the extension will search in the current document.</p>
 ```javascript
 if (extensions.less) {
    extensions.less.getVars(); 
}
```