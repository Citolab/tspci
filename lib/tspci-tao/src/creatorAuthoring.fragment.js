
      // Authoring mode (@citolab/tspci AUTHORING.md): the "Configure…" button opens the PCI's own editor for the
      // settings it manages (editor "pci"). The creator runs in TAO's page with RequireJS, so the runtime module is
      // required and getAuthoringInstance is called directly; no iframe and no messages.
      var authoring = '##__AUTHORING_OPTIONS__##';
      // A managed setting is usually JSON. TAO turns a JSON property into an object when it loads a saved item, so
      // read it back as text: for the PCI, and for the setting's text field (which would show "[object Object]").
      var settingText = function(value){
          return value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value);
      };
      authoring.settings.forEach(function(name){
          var value = interaction.prop(name);
          if (value !== undefined && value !== null) {
              $form.find('[name="' + name + '"]').val(settingText(value));
          }
      });
      $form.find('[data-pci-authoring]').on('click', function(){
          require(['jquery', 'i18n'], function($, __){
              openAuthoring($, __);
          });
      });

      function openAuthoring($, __){
          if ($('.tspci-authoring').length) {
              return;
          }
          var instance;
          var closed = false;
          var $dialog = $('<div class="tspci-authoring">' +
              '<div class="tspci-authoring-pci"></div>' +
              '<div class="feedback-error tspci-authoring-problems"></div>' +
              '<div class="tspci-authoring-actions">' +
              '<button type="button" class="btn-default small" data-action="cancel"></button> ' +
              '<button type="button" class="btn-info small" data-action="done" disabled></button>' +
              '</div></div>');
          var $pci = $dialog.find('.tspci-authoring-pci').css({
              width: authoring.width ? authoring.width + 'px' : '100%',
              height: authoring.height ? authoring.height + 'px' : 'auto',
              maxWidth: '100%',
              maxHeight: '70vh',
              overflow: 'auto'
          });
          var $problems = $dialog.find('.tspci-authoring-problems').hide();
          var $done = $dialog.find('[data-action="done"]').text(__('Done'));
          $dialog.find('[data-action="cancel"]').text(__('Cancel'));
          $dialog.find('.tspci-authoring-actions').css({ marginTop: '12px', textAlign: 'right' });

          var showProblems = function(problems){
              $problems.empty().append(problems.map(function(problem){
                  return $('<div>').text(problem);
              })).show();
          };
          // every way out (Cancel, Done, the close button, Escape) ends here
          var cleanUp = function(){
              closed = true;
              if (instance && typeof instance.destroy === 'function') {
                  instance.destroy();
              }
              instance = null;
              $dialog.remove();
          };
          var close = openDialog($, $dialog, startPci, cleanUp);

          $dialog.find('[data-action="cancel"]').on('click', close);
          $done.on('click', function(){
              if (!instance) {
                  return;
              }
              var problems = typeof instance.validate === 'function' ? instance.validate() || [] : [];
              if (problems.length) {
                  showProblems(problems);
                  return;
              }
              var config = instance.getConfig() || {};
              // only the managed properties are written, as strings, the same way the form fields write them
              authoring.properties.forEach(function(name){
                  if (Object.prototype.hasOwnProperty.call(config, name)) {
                      var value = String(config[name]);
                      interaction.prop(name, value);
                      interaction.triggerPci(name, value);
                      $form.find('[name="' + name + '"]').val(value);
                  }
              });
              close();
          });

          // the PCI renders once the dialog is in the page, so it can measure itself
          function startPci(){
              require(['##typeIdentifier##/interaction/runtime/js/index'], function(pciModule){
                  if (closed) {
                      return;
                  }
                  // the tspci bundle returns the registered PCI; else take what it registered with TAO's context
                  var pci = pciModule && typeof pciModule.getAuthoringInstance === 'function'
                      ? pciModule
                      : (window._pciHooks || {})['##typeIdentifier##'];
                  if (!pci || typeof pci.getAuthoringInstance !== 'function') {
                      showProblems([__('This version of the PCI has no authoring mode. Use the fields below the button instead.')]);
                      return;
                  }
                  var properties = {};
                  authoring.settings.forEach(function(name){
                      var value = interaction.prop(name);
                      if (value !== undefined && value !== null) {
                          properties[name] = settingText(value);
                      }
                  });
                  try {
                      var returned = pci.getAuthoringInstance($pci[0], {
                          properties: properties,
                          language: document.documentElement.getAttribute('lang') || navigator.language,
                          onready: function(ready){
                              instance = ready;
                              $done.prop('disabled', false);
                          },
                          // what Done said was missing may be fixed now; Done checks again
                          onchange: function(){
                              $problems.hide().empty();
                          }
                      });
                      if (returned) {
                          instance = returned;
                          $done.prop('disabled', false);
                      }
                  } catch (e) {
                      showProblems([String(e && e.message || e)]);
                  }
              }, function(e){
                  showProblems([String(e && e.message || e)]);
              });
          }
      }

      // TAO's modal (ui/modal) when the creator has it, else a plain overlay. Calls onOpened once the dialog is in
      // the page, and returns the function that closes it.
      function openDialog($, $dialog, onOpened, onClosed){
          var closed = false;
          var whenClosed = function(){
              if (!closed) {
                  closed = true;
                  onClosed();
              }
          };
          var close = function(){
              whenClosed();
          };
          require(['ui/modal'], function(){
              if (closed) {
                  return;
              }
              $dialog.addClass('modal').appendTo('body').modal({
                  width: Math.min((authoring.width || 640) + 48, Math.round(window.innerWidth * 0.96))
              });
              $dialog.on('closed.modal', function(){
                  $dialog.modal('destroy');
                  whenClosed();
              });
              close = function(){
                  $dialog.modal('close');
              };
              onOpened();
          }, function(){
              var $overlay = $('<div class="tspci-authoring-overlay">').css({
                  position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100000,
                  background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              });
              $dialog.css({ background: '#fff', padding: '24px', maxWidth: '96vw', maxHeight: '96vh', overflow: 'auto' });
              $overlay.append($dialog).appendTo('body');
              var onKey = function(e){
                  if (e.key === 'Escape') {
                      close();
                  }
              };
              $(document).on('keydown', onKey);
              close = function(){
                  $(document).off('keydown', onKey);
                  $overlay.remove();
                  whenClosed();
              };
              onOpened();
          });
          return function(){
              close();
          };
      }
