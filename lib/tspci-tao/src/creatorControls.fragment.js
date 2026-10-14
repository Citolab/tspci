
      // Typed settings (the editor hints in config.json, see @citolab/tspci AUTHORING.md). Runs before initWidget, so
      // TAO's select2 starts from the right option. TAO turns a property that looks like JSON (400, true) into a number
      // or boolean when it loads a saved item, and the `||` above drops 0 and false, so every control starts from the
      // property itself, as text.
      var controls = '##__CONTROLS_OPTIONS__##';
      var propertyText = function(value){
          return value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value);
      };
      var $setting = function(name){
          return $form.find(':input').filter(function(){
              return this.name === name;
          });
      };
      Object.keys(controls).forEach(function(name){
          var value = interaction.prop(name);
          if (value === undefined || value === null) {
              return;
          }
          value = propertyText(value);
          var $input = $setting(name);
          if (controls[name] === 'boolean') {
              $input.prop('checked', value === 'true');
              return;
          }
          // a value that is not one of the options (set elsewhere) is shown as it is, not as the first option
          if ($input.is('select') && !$input.find('option').filter(function(){ return this.value === value; }).length) {
              $input.append($input.find('option').first().clone().val(value).text(value));
          }
          $input.val(value);
      });

      // Colour pickers write through the setting's hidden field: its change event reaches the callbacks below,
      // which set the property and tell the PCI, as for any other field.
      var hexColor = function(value){
          var hex = String(value).trim();
          if (/^#[0-9a-f]{3}$/i.test(hex)) {
              hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
          }
          // <input type="color"> only takes #rrggbb; another colour ("red") shows as black until it is picked
          return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : '#000000';
      };
      var writeSetting = function($hidden, value){
          if ($hidden.val() !== value) {
              $hidden.val(value).trigger('change');
          }
      };
      var $colors = $form.find('[data-tspci-color]');
      $colors.each(function(i){
          var $color = $colors.eq(i);
          var $hidden = $setting($color.attr('data-tspci-color'));
          var $picker = $color.find('input[type="color"]').val(hexColor($hidden.val()));
          var $hex = $color.find('input[type="text"]').val($hidden.val());
          $picker.on('input', function(){
              $hex.val($picker.val());
          });
          $picker.on('change', function(){
              $hex.val($picker.val());
              writeSetting($hidden, $picker.val());
          });
          $hex.on('input change', function(){
              var value = $hex.val().trim();
              if (/^#([0-9a-f]{3}){1,2}$/i.test(value)) {
                  $picker.val(hexColor(value));
                  writeSetting($hidden, value);
              }
          });
      });
      var $colorLists = $form.find('[data-tspci-color-list]');
      $colorLists.each(function(i){
          var $list = $colorLists.eq(i);
          var $hidden = $setting($list.attr('data-tspci-color-list'));
          var $items = $list.find('[data-tspci-items]');
          var $template = $list.find('[data-tspci-item-template]');
          var $prototype = $template.children().first().detach();
          $template.remove();
          var colors = $hidden.val().split(',').map(function(color){ return color.trim(); }).filter(Boolean);
          var write = function(){
              writeSetting($hidden, colors.join(', '));
          };
          var render = function(){
              $items.empty();
              colors.forEach(function(color, index){
                  var $item = $prototype.clone();
                  $item.find('input[type="color"]').val(hexColor(color)).attr('title', color).on('change', function(){
                      colors[index] = this.value;
                      this.title = this.value;
                      write();
                  });
                  // the PCI needs at least one colour
                  $item.find('button').prop('disabled', colors.length < 2).on('click', function(){
                      colors.splice(index, 1);
                      render();
                      write();
                  });
                  $items.append($item);
              });
          };
          $list.find('[data-tspci-add]').on('click', function(){
              colors.push(colors.length ? hexColor(colors[colors.length - 1]) : '#000000');
              render();
              write();
          });
          render();
      });
