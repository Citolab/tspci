define([
    'lodash',
    '##typeIdentifier##/interaction/creator/widget/Widget',
    'tpl!##typeIdentifier##/interaction/creator/tpl/markup'
], function(_, Widget, markupTpl){

    var _typeIdentifier = '##typeIdentifier##';

    var interactionCreator = {
        /**
         * (required) Get the typeIdentifier of the custom interaction
         * 
         * @returns {String}
         */
        getTypeIdentifier : function(){
            return _typeIdentifier;
        },
        /**
         * (required) Get the widget prototype
         * Used in the renderer
         * 
         * @returns {Object} Widget
         */
        getWidget : function(){
            return Widget;
        },
        /**
         * (optional) Get the default properties values of the pci.
         * Used on new pci instance creation
         * 
         * @returns {Object}
         */
        getDefaultProperties : function(pci){
            return '##__DEFAULT_VALUES__##'
        },
        /**
         * (optional) Callback to execute on the 
         * Used on new pci instance creation
         * 
         * @returns {Object}
         */
        afterCreate : function(pci){
            pci.getResponseDeclaration().setTemplate('###_FIRST_SCORING_METHOD_###');
        },
        /**
         * (required) Gives the qti pci xml template 
         * 
         * @returns {function} handlebar template
         */
        getMarkupTemplate : function(){
            return markupTpl;
        },
        /**
         * (optional) Allows passing additional data to xml template
         * 
         * @returns {function} handlebar template
         */
        getMarkupData : function(pci, defaultData){
            defaultData.prompt = pci.data('prompt');
            return defaultData;
        }
    };

    //since we assume we are in a tao context, there is no use to expose the a global object for lib registration
    //all libs should be declared here
    return interactionCreator;
});