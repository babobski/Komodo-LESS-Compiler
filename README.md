Less Compiler for Komodo Edit/Ide
=========================

a LESS 2.6.1 compiler for Komodo Edit/Ide.  
This addon allows you to compile LESS files.

## Usage
If you install this addon. default the compiler is enabled.  
When you edit a LESS file the file will be compiled to a CSS file.  
The addon lets you set up a *File Watcher* or multiple *File Scopes* so you can work with imports and multiple less files in one project or multiple open projects( max. 3 ).  
There are also some options available trough the menu.

### Menu options
**Tools > LESS > ...**
 * **Compile Saved File into CSS**  
Takes a .less file and creates a .css file with the same name in the same spot as the .less file.
 * **Compile Current Buffer (including imports)**  
 into CSS. Takes the contents of the current buffer and turns it into CSS.
 * **Compile Selection into CSS (including imports)**  
Takes the current selection and turns it into CSS
 * **Compile and Compress Saved File into CSS**  
 Takes a .less file and creates a .css file with the same name in the same spot as the .less file. The .less file will be compressed/minified.
 * **Compile and Compress Current Buffer (including imports)**  
 into CSS. Takes the contents of the current buffer and turns it into compressed CSS.
 * **Compile and Compress Selection into CSS (including imports)**  
 takes the current selection and turns it into compressed CSS.
 * **File Watcher**
  * **Enable File Watcher for current file**  
  Enables a file watcher for current LESS file 
  * **disable File Watcher**  
  Disables the file watcher
 * **Less Settings**  
 This will open the settings window.
 
### Statusbar
When editing Less files, a Less statusbar will be shown.  
The statusbar well tell you, if the compiler is enabled/disabled, if a file watcher or file scope is active and it will show errors if present.  
![Screensot](screenshot01.png)  
Trough the statusbar you can easily configure the settings.
#### Statusbar options
 * **Disable Compiler**  
 This will disable the compiler
 * **Enable File Watcher**  
 This will enable a file watcher for the current file, when you edit less file's only the "Watched file" will be compiled
 * **File Scopes**  
 This will open a window where you can set file scopes, so you can work with multiple output files in one project or work with multiple projects.
 * **Settings**  
 This will open the settings window.

### File Scopes
![screenshot](screenshot03.png)  
In the file scopes window, you can setup up to 3 file scopes.  
For each file scope you can set a output file( this file will be triggered if a less file is in the current scope ) and set up to 3 include folders.  
If a LESS file is inside(recursively) a file scope, the selected output file will be compiled on save.
This allows you to work with multiple file scopes in one project or allows to work with multiple open projects( komodo windows )
 

