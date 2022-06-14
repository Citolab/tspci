define([
    'taoQtiItem/qtiCreator/widgets/interactions/customInteraction/Widget',
    '##typeIdentifier##/interaction/creator/widget/states/states'
], function(Widget, states){

    var InteractionWidget = Widget.clone();

    InteractionWidget.initCreator = function(){
        this.registerStates(states);
        
        Widget.initCreator.call(this);
    };
    
    return InteractionWidget;
});