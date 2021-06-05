const runScripts = {
  extMan: null,
  scriptDir: '../scripts',
  showOutput: true,
  hist: [],
  histFile: '',
  template: `
#!/bin/zsh

#
# The following Environment Variables are created by Modal File Manager 
# before running your script:
#
# $CURRENT_DIRECTORY          The current directory for the cursor
# $CURRENT_FILE               The current file name for the cursor
# $LEFT_PANE                  The directory of the left file pane
# $LEFT_PANE_SELECTED_FILE    The last highlighted file in the left file pane
# $RIGHT_PANE                 The directory of the right file pane
# $RIGHT_PANE_SELECTED_FILE   The last highlighted file in the right file pane
# $FILES_SELECTED             A newline separated list of selected files
# 
# After creating the script, you have to set the mode to executable for 
# it to be ran. You can change the shebang to run any language on your 
# computer (and then change the comments also).
#
  `,
  init: function(extManager) {
    runScripts.extMan = extManager;
    var cmds = runScripts.extMan.getCommands();
    const lfs = extManager.localFS;
    var extdir = extManager.getExtensionDir();
    runScripts.histFile = lfs.appendPath(extdir,'../cmdhist.json');
    runScripts.scriptDir = lfs.appendPath(extdir, '../scripts');
    if(!lfs.dirExists(runScripts.scriptDir)) {
      lfs.makeDir(runScripts.scriptDir);
    }
    if(!lfs.fileExists(runScripts.histFile)) {
      lfs.writeFile(runScripts.histFile, JSON.stringify(['ls']));
      runScripts.hist = ['ls'];
    } else {
      runScripts.hist = JSON.parse(lfs.readFile(runScripts.histFile));
    }
    cmds.addCommand('Run Script', 'runScripts.runScript','Run a user created script.', runScripts.runScript);
    cmds.addCommand('Run NPM Script', 'runScripts.runNpmScript','Run a npm script.', runScripts.runNpmScript);
    cmds.addCommand('Run Mask Script', 'runScripts.runMaskScript','Run a Mask script.', runScripts.runMaskScript);
    cmds.addCommand('Create Script', 'runScripts.createScript','Create a script.', runScripts.createScript);
    cmds.addCommand('Toggle Show Output', 'runScripts.toggleShowOutput','Toggle the showing of an output from running scripts.', runScripts.toggleShowOutput);
    cmds.addCommand('Run Command Line', 'runScripts.runCommandLine','Run a command line the user gives.', runScripts.runCommandLine);
    cmds.addCommand('Edit Script', 'runScripts.editScript','Edit the user specified script.', runScripts.editScript);
    cmds.addCommand('Go To Scripts Directory', 'runScripts.goToScript','Open the scripts directory.', runScripts.goToScript);
    cmds.addCommand('Install Example Scripts', 'runScripts.copyExampleScripts','Install the example scripts. If you have changed any, they will be overwritten.', runScripts.copyExampleScripts);
  },
  copyExampleScripts: function() {
    const lfs = runScripts.extMan.localFS;
    if(lfs.dirExists(runScripts.scriptDir)) {
      var orgScriptDir = lfs.appendPath(runScripts.extMan.getExtensionDir(),'runScripts-ModalFileManagerExtension/scripts');
      if(lfs.dirExists(orgScriptDir)) {
        const scrpts = lfs.getDirList(orgScriptDir);
        runScripts.extMan.getExtCommand('copyEntriesCommand').command(scrpts, {
          dir: runScripts.scriptDir,
          name: ''
        });
      }
    }
  },
  saveHistFile: function() {
    runScripts.hist = [...new Set(runScripts.hist)];
    runScripts.extMan.localFS.writeFile(runScripts.histFile, JSON.stringify(runScripts.hist));
  },
  unload: function() {
    runScripts.saveHistFile();
  },
  installKeyMaps: function() {
  },
  goToScript: function() {
    runScripts.extMan.getExtCommand('changeDir').command({
      path: runScripts.scriptDir
    });
  },
  toggleShowOutput: function() {
    if(runScripts.showOutput) {
      runScripts.showOutput = false;
    } else {
      runScripts.showOutput = true;
    }
  },
  runCommandLine: function() {
    // 
    // This will prompt the user for a command line to run. It shows 
    // past command lines to pick from as well.
    //
    runScripts.extMan.getExtCommand('pickItem').command('Command Line:', runScripts.hist.map(item => {
      return({
        name: item,
        value: item
      });
    }), runScripts.runCommandLineReturn, true);
  },
  runCommandLineReturn: function(value) {
    if(value !== null) {
      runScripts.hist.push(value);
      runScripts.saveHistFile();
      runScripts.returnScript(value);
    } else {
      runScripts.extMan.getExtCommand('showMessage').command('Run Command Line', 'Not a proper command line. Try again.');
    }
  },
  runNpmScript: function() {
    //
    // This will show all npm scripts in the current directory and prompt the 
    // user to select one.
    //
    const lfs = runScripts.extMan.localFS;
    const lcursor = runScripts.extMan.getExtCommand('getCursor').command();
    const npmf = lfs.appendPath(lcursor.entry.dir, 'package.json');
    if(lfs.fileExists(npmf)) {
      var npmFile = JSON.parse(lfs.readFile(npmf));
      var scripts = [];
      Object.keys(npmFile.scripts).forEach(item => {
        scripts.push({
          name: item,
          value: item
        });
      });
      runScripts.extMan.getExtCommand('pickItem').command('Which Npm Script?', scripts, runScripts.runNpmScriptReturn);
    } else {
      runScripts.extMan.getExtCommand('showMessage').command('Run User Scripts', 'No package.json file in this directory!');
    }
  },
  runNpmScriptReturn: function(value) {
    runScripts.returnScript('npm run ' + value);
  },
  runMaskScript: function() {
    //
    // This will show all Mask scripts in the current directory and prompt the 
    // user to select one.
    //
    const lfs = runScripts.extMan.localFS;
    const lcursor = runScripts.extMan.getExtCommand('getCursor').command();
    const maskf = lfs.appendPath(lcursor.entry.dir, 'maskfile.md');
    var scripts = [];
    if(lfs.fileExists(maskf)) {
      var npmFile = new String(lfs.readFile(maskf)).split('\n').forEach(el => {
        var mtch = el.match(/##\ ([^\ ]*)/);
        console.log(mtch);
        if(mtch !== null) {
          scripts.push({
            name: mtch[1],
            value: mtch[1]
          })
        }
      });
      console.log(scripts);

      runScripts.extMan.getExtCommand('pickItem').command('Which Mask Script?', scripts, runScripts.runMaskScriptReturn);
    } else {
      runScripts.extMan.getExtCommand('showMessage').command('Run User Scripts', 'No maskfile.md file in this directory!');
    }
  },
  runMaskScriptReturn: function(value) {
    runScripts.returnScript('mask ' + value);
  },
  runScript: function() {
    const lfs = runScripts.extMan.localFS;
    const scrpts = lfs.getDirList(runScripts.scriptDir).map(item => {
      return {
        name: item.name,
        value: lfs.appendPath(item.dir, item.name)
      }
    });
    if(scrpts.length < 1) {
      // 
      // Tell the user to create some scripts.
      //
      runScripts.extMan.getExtCommand('showMessage').command('Run User Scripts', 'No scripts created yet. Start making some!');
    } else {
      //
      // List the scripts for the user to pick from.
      //
      runScripts.extMan.getExtCommand('pickItem').command('Which Script?', scrpts, runScripts.returnScript);
    }
  },
  returnScript: function(value) {
    const lfs = runScripts.extMan.localFS;
    var sEnv = [];
    
    const lcursor = runScripts.extMan.getExtCommand('getCursor').command();
    const lLeftFile = runScripts.extMan.getExtCommand('getLeftFile').command();
    const lRightFile = runScripts.extMan.getExtCommand('getRightFile').command();
    const lLeftDir = runScripts.extMan.getExtCommand('getLeftDir').command();
    const lRightDir = runScripts.extMan.getExtCommand('getRightDir').command();
    const sFileList = runScripts.extMan.getExtCommand('getSelectedFiles').command().map(item => {
      return(lfs.appendPath(item.dir, item.name));
    });

    sEnv['CURRENT_DIRECTORY'] = lcursor.entry.dir;
    sEnv['CURRENT_FILE'] = lcursor.entry.name;
    sEnv['LEFT_PANE'] = lLeftDir.path;
    sEnv['LEFT_PANE_SELECTED_FILE'] = lLeftFile.entry.name;
    sEnv['RIGHT_PANE'] = lRightDir.path;
    sEnv['RIGHT_PANE_SELECTED_FILE'] = lRightFile.entry.name;
    sEnv['FILES_SELECTED'] = sFileList.join('\n');

    lfs.runCommandLine(value,(err, data)=>{ 
      if(runScripts.showOutput) {
        //
        // Show the user the output from the script.
        //
        if(err) {
          runScripts.showOutputDialog('Error: ' + err);
        } else {
          runScripts.showOutputDialog(data);
        }
      }
    }, sEnv, {
      cwd: lcursor.entry.dir
    });
  },
  showOutputDialog: function(msg) {
    //
    // Show the user the message.
    //
    msg = msg.replaceAll('\n','<br />');
    msg = msg.replaceAll(/Error/gi,'<span style="color: red;">Error</span>');
    msg = "<div style='display: flex; flex-direction: column; overflow: auto; height: 200px;'>" + msg + "</div>";
    runScripts.extMan.getExtCommand('showMessage').command('Script Output', msg);
  },
  createScript: function() {
    runScripts.extMan.getExtCommand('askQuestion').command('Create User Scripts', 'Name of the script file (with extension):', runScripts.createScriptReturn);
  },
  createScriptReturn: function(value) {
    const lfs = runScripts.extMan.localFS;
    value = value.trim();
    const sptFile = lfs.appendPath(runScripts.scriptDir, value);
    console.log(sptFile);
    if(!lfs.fileExists(sptFile)) {
      lfs.writeFile(sptFile,runScripts.template);
      runScripts.returnEdit(sptFile);
    } else {
      runScripts.extMan.getExtCommand('showMessage').command('Create User Script', 'Script already exists!');
    }
  },
  editScript: function() {
    //
    // Show the user the list of scripts and open the selected one in the 
    // editor.
    //
    const lfs = runScripts.extMan.localFS;
    const scrpts = lfs.getDirList(runScripts.scriptDir).map(item => {
      return {
        name: item.name,
        value: lfs.appendPath(item.dir, item.name)
      }
    });
    if(scrpts.length < 1) {
      // 
      // Tell the user to create some scripts.
      //
      runScripts.extMan.getExtCommand('showMessage').command('Run User Scripts', 'No scripts created yet. Start making some!');
    } else {
      //
      // List the scripts for the user to pick from.
      //
      runScripts.extMan.getExtCommand('pickItem').command('Which Script?', scrpts, runScripts.returnEdit);
    }
  },
  returnEdit: function(value) {
    runScripts.extMan.getExtCommand('editEntryCommand').command(value);
  }
};
return(runScripts);
  
