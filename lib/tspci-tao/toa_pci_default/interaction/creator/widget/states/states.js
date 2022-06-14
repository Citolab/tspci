define([
    'taoQtiItem/qtiCreator/widgets/states/factory',
    'taoQtiItem/qtiCreator/widgets/interactions/customInteraction/states/states',
    '##typeIdentifier##/interaction/creator/widget/states/Question',
    '##typeIdentifier##/interaction/creator/widget/states/Answer',
    '##typeIdentifier##/interaction/creator/widget/states/Correct'
], function(factory, states){
    return factory.createBundle(states, arguments, ['map']);
});