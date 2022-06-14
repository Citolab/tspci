<div class="panel">
    <input type="text" 
           name="identifier" 
           value="{{identifier}}" 
           placeholder="e.g. RESPONSE" 
           data-validate="$notEmpty; $qtiIdentifier; $availableIdentifier(serial={{serial}});">
    <!-- ##_HTML_CONTROLS_## -->
</div>