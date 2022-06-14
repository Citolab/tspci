define([
  "taoQtiItem/qtiCreator/widgets/states/factory",
  "taoQtiItem/qtiCreator/widgets/interactions/states/Correct",
  "lodash",
], function (stateFactory, Correct, _) {
  var InteractionStateCorrect = stateFactory.create(
    Correct,
    function () {
      var widget = this.widget;
      var interaction = widget.element;
      var responseDeclaration = interaction.getResponseDeclaration();
      var correct = _.values(responseDeclaration.getCorrect());
          // show correct response in the pci.
      if (correct && typeof correct[0] !== "undefined") {
        interaction?.setResponse && interaction.setResponse({ base: { string: correct[0] } });
      }
    },
    function () {
      var widget = this.widget;
      var interaction = widget.element;
      var responseDeclaration = interaction.getResponseDeclaration();
      var correct = interaction && interaction.getResponse ? interaction.getResponse() : undefined;
      var correctString = '';
      if (correct !== undefined && correct.base) {
        if (correct.base.string !== null && (correct.base.string !== undefined)) {
            correctString = correct.base.string;
        } else if (correct.base.integer !== null && (correct.base.integer !== undefined)) {
            correctString = correct.base.integer;
        } else if (correct.base.boolean !== null && (correct.base.boolean !== undefined)) {
            correctString = correct.base.boolean;
        }
      }
     
      //   getResponse
      //   var correct = _.values(responseDeclaration.getCorrect());
      responseDeclaration.setCorrect(correctString);

      interaction.resetResponse();
      interaction.offPci(".question");
    }
  );

  return InteractionStateCorrect;
});
