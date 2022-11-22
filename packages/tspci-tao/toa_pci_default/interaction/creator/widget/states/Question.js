define([
  'taoQtiItem/qtiCreator/widgets/states/factory',
  'taoQtiItem/qtiCreator/widgets/interactions/states/Question',
  'taoQtiItem/qtiCreator/widgets/helpers/formElement',
  'tpl!##typeIdentifier##/interaction/creator/tpl/propertiesForm',
  'tpl!taoQtiItem/qtiCreator/tpl/notifications/widgetOverlay'
], function(stateFactory, Question, formElement, formTpl, overlayTpl){
;
  var InteractionStateQuestion = stateFactory.extend(Question, function(){

      //add transparent protective layer
      this.widget.$container.append(overlayTpl());

  }, function(){

      //remove transparent protective layer
      this.widget.$container.children('.overlay').remove();
      
  });

  InteractionStateQuestion.prototype.initForm = function(){

      var _widget = this.widget,
          $form = _widget.$form,
          interaction = _widget.element,
          response = interaction.getResponseDeclaration();
     // ##__DECLARE_VARIABLES__##

      //render the form using the form template
      $form.html(formTpl({
          serial : response.serial,
          identifier : interaction.attr('responseIdentifier'),
          // ##__SET_VARIABLES__##
      }));

      //init form javascript
      formElement.initWidget($form);

      //init data change callbacks
      formElement.setChangeCallbacks($form, interaction, {
          identifier : function(i, value){
              response.id(value);
              interaction.attr('responseIdentifier', value);
          },
          // ##__CALLBACK__##
      });

  };

  return InteractionStateQuestion;
});
