<?php
/**
 * Plugin Name: Investment Advisor Chatbot
 * Plugin URI: https://github.com/yourusername/investment-advisor-chatbot
 * Description: An AI-powered investment advisor chatbot with enhanced real-time stock quotes via Yahoo Finance (comprehensive financial metrics, market indices, caching), interactive price charts with Chart.js, real-time risk profiling, general market data via Google Search, conversational voice input/output with advanced voice selection, iOS Safari compatibility, bilingual support (English/Arabic), professional financial guidance, and Alpaca paper trading integration with verbal confirmation.
 * Version:           5.1.1
 * Author: Rorie Devine
 * Author URI: https://allvesta.ai
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: investment-advisor
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 7.4
 * Network: false
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('INVESTMENT_ADVISOR_VERSION', '5.1.1');
define('INVESTMENT_ADVISOR_PLUGIN_URL', plugin_dir_url(__FILE__));
define('INVESTMENT_ADVISOR_PLUGIN_PATH', plugin_dir_path(__FILE__));

/**
 * Main Investment Advisor Plugin Class
 */
class InvestmentAdvisorPlugin {
    
    /**
     * Constructor
     */
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'admin_init'));
        add_action('rest_api_init', array($this, 'customize_rest_cors'), 15);
        
        // Register shortcode
        add_shortcode('investment_advisor', array($this, 'shortcode_handler'));
        
        // AJAX handlers for Google search
        add_action('wp_ajax_investment_advisor_google_search', array($this, 'ajax_google_search'));
        add_action('wp_ajax_nopriv_investment_advisor_google_search', array($this, 'ajax_google_search'));
        
        // AJAX handlers for Yahoo Finance
        add_action('wp_ajax_investment_advisor_yahoo_finance', array($this, 'ajax_yahoo_finance'));
        add_action('wp_ajax_nopriv_investment_advisor_yahoo_finance', array($this, 'ajax_yahoo_finance'));
        
        // AJAX handlers for historical chart data
        add_action('wp_ajax_investment_advisor_chart_data', array($this, 'ajax_chart_data'));
        add_action('wp_ajax_nopriv_investment_advisor_chart_data', array($this, 'ajax_chart_data'));
        
        // Activation and deactivation hooks
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    public function customize_rest_cors() {
        remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
        add_filter('rest_pre_serve_request', array($this, 'send_custom_cors_headers'), 15, 3);
    }

    public function send_custom_cors_headers($served, $result, $request) {
        $allowed_origins = apply_filters('investment_advisor_allowed_origins', array(
            'https://allvesta.ai',
            'https://www.allvesta.ai',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
        ));

        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

        if ($origin && in_array($origin, $allowed_origins, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        } else {
            header('Access-Control-Allow-Origin: https://allvesta.ai');
        }

        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');

        return $served;
    }
    
    /**
     * Initialize the plugin
     */
    public function init() {
        // Load text domain for translations
        load_plugin_textdomain('investment-advisor', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    /**
     * Enqueue frontend scripts and styles
     */
    public function enqueue_scripts() {
        wp_enqueue_style(
            'investment-advisor-style',
            INVESTMENT_ADVISOR_PLUGIN_URL . 'assets/css/investment-advisor.css',
            array(),
            INVESTMENT_ADVISOR_VERSION
        );
        
        // Enqueue Chart.js library
        wp_enqueue_script(
            'chart-js',
            'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
            array(),
            '4.4.0',
            true
        );
        
        wp_enqueue_script(
            'investment-advisor-script',
            INVESTMENT_ADVISOR_PLUGIN_URL . 'assets/js/investment-advisor.js',
            array('jquery', 'chart-js'),
            INVESTMENT_ADVISOR_VERSION,
            true
        );
        
        // Localize script with API key and settings
        $api_key = get_option('investment_advisor_api_key', '');
        wp_localize_script('investment-advisor-script', 'investmentAdvisorAjax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('investment_advisor_nonce'),
            'api_key' => $api_key,
            'plugin_url' => INVESTMENT_ADVISOR_PLUGIN_URL
        ));
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function admin_enqueue_scripts($hook) {
        if ('settings_page_investment-advisor' !== $hook) {
            return;
        }
        
        wp_enqueue_style(
            'investment-advisor-admin-style',
            INVESTMENT_ADVISOR_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            INVESTMENT_ADVISOR_VERSION
        );
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            __('Investment Advisor Settings', 'investment-advisor'),
            __('Investment Advisor', 'investment-advisor'),
            'manage_options',
            'investment-advisor',
            array($this, 'admin_page')
        );
    }
    
    /**
     * Admin page initialization
     */
    public function admin_init() {
        register_setting('investment_advisor_settings', 'investment_advisor_api_key');
        register_setting('investment_advisor_settings', 'investment_advisor_widget_title');
        register_setting('investment_advisor_settings', 'investment_advisor_welcome_message');
        register_setting('investment_advisor_settings', 'investment_advisor_system_prompt');
        register_setting('investment_advisor_settings', 'investment_advisor_domain1_name');
        register_setting('investment_advisor_settings', 'investment_advisor_domain1_prompt');
        register_setting('investment_advisor_settings', 'investment_advisor_domain2_name');
        register_setting('investment_advisor_settings', 'investment_advisor_domain2_prompt');
        register_setting('investment_advisor_settings', 'investment_advisor_domain3_name');
        register_setting('investment_advisor_settings', 'investment_advisor_domain3_prompt');
        register_setting('investment_advisor_settings', 'investment_advisor_voice_name');
        register_setting('investment_advisor_settings', 'investment_advisor_google_api_key');
        register_setting('investment_advisor_settings', 'investment_advisor_google_search_engine_id');
        
        add_settings_section(
            'investment_advisor_main_section',
            __('Main Settings', 'investment-advisor'),
            array($this, 'settings_section_callback'),
            'investment-advisor'
        );
        
        add_settings_field(
            'investment_advisor_api_key',
            __('OpenAI API Key', 'investment-advisor'),
            array($this, 'api_key_field_callback'),
            'investment-advisor',
            'investment_advisor_main_section'
        );
        
        add_settings_field(
            'investment_advisor_widget_title',
            __('Widget Title', 'investment-advisor'),
            array($this, 'widget_title_field_callback'),
            'investment-advisor',
            'investment_advisor_main_section'
        );
        
        add_settings_field(
            'investment_advisor_welcome_message',
            __('Welcome Message', 'investment-advisor'),
            array($this, 'welcome_message_field_callback'),
            'investment-advisor',
            'investment_advisor_main_section'
        );
        
        add_settings_field(
            'investment_advisor_system_prompt',
            __('Default System Prompt', 'investment-advisor'),
            array($this, 'system_prompt_field_callback'),
            'investment-advisor',
            'investment_advisor_main_section'
        );
        
        add_settings_field(
            'investment_advisor_domain1_name',
            __('Domain 1 Name', 'investment-advisor'),
            array($this, 'domain1_name_field_callback'),
            'investment-advisor',
            'investment_advisor_main_section'
        );
        
        add_settings_field(
            'investment_advisor_domain1_prompt',
            __('Domain 1 System Prompt', 'investment-advisor'),
            array($this, 'domain1_prompt_field_callback'),
            'investment-advisor',
            'investment_advisor_main_section'
        );
        
        add_settings_field(
            'investment_advisor_domain2_name',
            __('Domain 2 Name', 'investment-advisor'),
            array($this, 'domain2_name_field_callback'),
            'investment-advisor',
            'investment_advisor_main_section'
        );
        
        add_settings_field(
            'investment_advisor_domain2_prompt',
            __('Domain 2 System Prompt', 'investment-advisor'),
            array($this, 'domain2_prompt_field_callback'),
            'investment-advisor',
            'investment_advisor_main_section'
        );
        
        add_settings_field(
            'investment_advisor_domain3_name',
            __('Domain 3 Name', 'investment-advisor'),
            array($this, 'domain3_name_field_callback'),
            'investment-advisor',
            'investment_advisor_main_section'
        );
        
        add_settings_field(
            'investment_advisor_domain3_prompt',
            __('Domain 3 System Prompt', 'investment-advisor'),
            array($this, 'domain3_prompt_field_callback'),
            'investment-advisor',
            'investment_advisor_main_section'
        );
        
        add_settings_field(
            'investment_advisor_voice_name',
            __('Voice Accent/Language', 'investment-advisor'),
            array($this, 'voice_name_field_callback'),
            'investment-advisor',
            'investment_advisor_main_section'
        );
        
        add_settings_field(
            'investment_advisor_google_api_key',
            __('Google Custom Search API Key', 'investment-advisor'),
            array($this, 'google_api_key_field_callback'),
            'investment-advisor',
            'investment_advisor_main_section'
        );
        
        add_settings_field(
            'investment_advisor_google_search_engine_id',
            __('Google Search Engine ID', 'investment-advisor'),
            array($this, 'google_search_engine_id_field_callback'),
            'investment-advisor',
            'investment_advisor_main_section'
        );
    }
    
    /**
     * Settings section callback
     */
    public function settings_section_callback() {
        echo '<p>' . __('Configure your Investment Advisor Chatbot settings below.', 'investment-advisor') . '</p>';
    }
    
    /**
     * API Key field callback
     */
    public function api_key_field_callback() {
        $api_key = get_option('investment_advisor_api_key', '');
        echo '<input type="password" id="investment_advisor_api_key" name="investment_advisor_api_key" value="' . esc_attr($api_key) . '" class="regular-text" />';
        
        if (!empty($api_key)) {
            echo '<p class="description" style="color: #46b450; font-weight: 500;">✅ ' . __('API key is configured. The chatbot will work without requiring users to enter their own API key.', 'investment-advisor') . '</p>';
        } else {
            echo '<p class="description">' . __('Enter your OpenAI API key. Get one from <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a>', 'investment-advisor') . '</p>';
            echo '<p class="description" style="color: #d63638;"><strong>' . __('Note:', 'investment-advisor') . '</strong> ' . __('Without an API key, users will need to enter their own API key to use the chatbot.', 'investment-advisor') . '</p>';
        }
    }
    
    /**
     * Widget title field callback
     */
    public function widget_title_field_callback() {
        $title = get_option('investment_advisor_widget_title', 'Investment Advisor');
        echo '<input type="text" id="investment_advisor_widget_title" name="investment_advisor_widget_title" value="' . esc_attr($title) . '" class="regular-text" />';
        echo '<p class="description">' . __('The title displayed in the widget header.', 'investment-advisor') . '</p>';
    }
    
    /**
     * Welcome message field callback
     */
    public function welcome_message_field_callback() {
        $message = get_option('investment_advisor_welcome_message', 
            "Welcome! I'm your investment advisor. I can help you with financial planning and investment strategies in English or Arabic. How can I assist you today?\n\nمرحباً! أنا مستشارك المالي. يمكنني مساعدتك في التخطيط المالي واستراتيجيات الاستثمار. كيف يمكنني مساعدتك اليوم؟"
        );
        echo '<textarea id="investment_advisor_welcome_message" name="investment_advisor_welcome_message" rows="5" class="large-text">' . esc_textarea($message) . '</textarea>';
        echo '<p class="description">' . __('The welcome message displayed when the chat starts.', 'investment-advisor') . '</p>';
    }
    
    /**
     * System prompt field callback
     */
    public function system_prompt_field_callback() {
        $default_prompt = "You are a highly experienced and knowledgeable investment advisor with deep expertise in financial markets, portfolio management, risk assessment, and investment strategies across global markets. You provide personalized, accurate, and actionable investment advice to clients in both English and Arabic languages. Your expertise covers stocks, bonds, ETFs, mutual funds, real estate, commodities, cryptocurrencies, and alternative investments. You always consider the client's risk tolerance, investment goals, time horizon, financial situation, and market conditions when making recommendations. You provide clear explanations, educational content, and help clients make informed investment decisions. You stay current with market trends, economic indicators, and regulatory changes. You are professional, ethical, and always act in the client's best interest while being transparent about risks and potential returns.";
        
        $prompt = get_option('investment_advisor_system_prompt', $default_prompt);
        echo '<textarea id="investment_advisor_system_prompt" name="investment_advisor_system_prompt" rows="8" class="large-text" style="font-family: monospace; font-size: 12px;">' . esc_textarea($prompt) . '</textarea>';
        echo '<p class="description">' . __('Default system prompt used when no domain parameter is specified in the shortcode.', 'investment-advisor') . '</p>';
    }
    
    /**
     * Domain 1 name field callback
     */
    public function domain1_name_field_callback() {
        $name = get_option('investment_advisor_domain1_name', '');
        echo '<input type="text" id="investment_advisor_domain1_name" name="investment_advisor_domain1_name" value="' . esc_attr($name) . '" class="regular-text" placeholder="e.g., healthcare.com or mysite1.com" />';
        echo '<p class="description">' . __('Enter the domain URL (e.g., healthcare.com, example.org). The chatbot will automatically use this prompt when loaded on this domain.', 'investment-advisor') . '</p>';
    }
    
    /**
     * Domain 1 prompt field callback
     */
    public function domain1_prompt_field_callback() {
        $prompt = get_option('investment_advisor_domain1_prompt', '');
        echo '<textarea id="investment_advisor_domain1_prompt" name="investment_advisor_domain1_prompt" rows="6" class="large-text" style="font-family: monospace; font-size: 12px;" placeholder="System prompt for this domain...">' . esc_textarea($prompt) . '</textarea>';
        echo '<p class="description">' . __('Custom system prompt for Domain 1. This will override the default prompt when the chatbot is loaded on the specified domain.', 'investment-advisor') . '</p>';
    }
    
    /**
     * Domain 2 name field callback
     */
    public function domain2_name_field_callback() {
        $name = get_option('investment_advisor_domain2_name', '');
        echo '<input type="text" id="investment_advisor_domain2_name" name="investment_advisor_domain2_name" value="' . esc_attr($name) . '" class="regular-text" placeholder="e.g., realtor.net or mysite2.com" />';
        echo '<p class="description">' . __('Enter the domain URL (e.g., realtor.net, example.com). The chatbot will automatically use this prompt when loaded on this domain.', 'investment-advisor') . '</p>';
    }
    
    /**
     * Domain 2 prompt field callback
     */
    public function domain2_prompt_field_callback() {
        $prompt = get_option('investment_advisor_domain2_prompt', '');
        echo '<textarea id="investment_advisor_domain2_prompt" name="investment_advisor_domain2_prompt" rows="6" class="large-text" style="font-family: monospace; font-size: 12px;" placeholder="System prompt for this domain...">' . esc_textarea($prompt) . '</textarea>';
        echo '<p class="description">' . __('Custom system prompt for Domain 2. This will override the default prompt when the chatbot is loaded on the specified domain.', 'investment-advisor') . '</p>';
    }
    
    /**
     * Domain 3 name field callback
     */
    public function domain3_name_field_callback() {
        $name = get_option('investment_advisor_domain3_name', '');
        echo '<input type="text" id="investment_advisor_domain3_name" name="investment_advisor_domain3_name" value="' . esc_attr($name) . '" class="regular-text" placeholder="e.g., legal.org or mysite3.com" />';
        echo '<p class="description">' . __('Enter the domain URL (e.g., legal.org, example.io). The chatbot will automatically use this prompt when loaded on this domain.', 'investment-advisor') . '</p>';
    }
    
    /**
     * Domain 3 prompt field callback
     */
    public function domain3_prompt_field_callback() {
        $prompt = get_option('investment_advisor_domain3_prompt', '');
        echo '<textarea id="investment_advisor_domain3_prompt" name="investment_advisor_domain3_prompt" rows="6" class="large-text" style="font-family: monospace; font-size: 12px;" placeholder="System prompt for this domain...">' . esc_textarea($prompt) . '</textarea>';
        echo '<p class="description">' . __('Custom system prompt for Domain 3. This will override the default prompt when the chatbot is loaded on the specified domain.', 'investment-advisor') . '</p>';
    }
    
    /**
     * Voice name field callback
     */
    public function voice_name_field_callback() {
        $voice_name = get_option('investment_advisor_voice_name', '');
        ?>
        <select id="investment_advisor_voice_name" name="investment_advisor_voice_name" class="regular-text">
            <option value=""><?php _e('Auto (British English Default)', 'investment-advisor'); ?></option>
            <optgroup label="<?php _e('Language Code (Flexible)', 'investment-advisor'); ?>">
                <option value="en-GB" <?php selected($voice_name, 'en-GB'); ?>>en-GB (British English - Any Voice)</option>
                <option value="en-US" <?php selected($voice_name, 'en-US'); ?>>en-US (American English - Any Voice)</option>
                <option value="en-AU" <?php selected($voice_name, 'en-AU'); ?>>en-AU (Australian English - Any Voice)</option>
                <option value="ar-SA" <?php selected($voice_name, 'ar-SA'); ?>>ar-SA (Arabic - Any Voice)</option>
            </optgroup>
            <optgroup label="<?php _e('English - UK (British)', 'investment-advisor'); ?>">
                <option value="Daniel" <?php selected($voice_name, 'Daniel'); ?>>Daniel (UK Male)</option>
                <option value="Karen" <?php selected($voice_name, 'Karen'); ?>>Karen (UK Female)</option>
                <option value="Serena" <?php selected($voice_name, 'Serena'); ?>>Serena (UK Female)</option>
                <option value="Oliver" <?php selected($voice_name, 'Oliver'); ?>>Oliver (UK Male)</option>
                <option value="Arthur" <?php selected($voice_name, 'Arthur'); ?>>Arthur (UK Male)</option>
                <option value="Kate" <?php selected($voice_name, 'Kate'); ?>>Kate (UK Female)</option>
            </optgroup>
            <optgroup label="<?php _e('English - US (American)', 'investment-advisor'); ?>">
                <option value="Samantha" <?php selected($voice_name, 'Samantha'); ?>>Samantha (US Female)</option>
                <option value="Alex" <?php selected($voice_name, 'Alex'); ?>>Alex (US Male)</option>
                <option value="Victoria" <?php selected($voice_name, 'Victoria'); ?>>Victoria (US Female)</option>
                <option value="Allison" <?php selected($voice_name, 'Allison'); ?>>Allison (US Female)</option>
                <option value="Tom" <?php selected($voice_name, 'Tom'); ?>>Tom (US Male)</option>
            </optgroup>
            <optgroup label="<?php _e('English - Australia', 'investment-advisor'); ?>">
                <option value="Catherine" <?php selected($voice_name, 'Catherine'); ?>>Catherine (AU Female)</option>
                <option value="Gordon" <?php selected($voice_name, 'Gordon'); ?>>Gordon (AU Male)</option>
            </optgroup>
            <optgroup label="<?php _e('Arabic', 'investment-advisor'); ?>">
                <option value="Maged" <?php selected($voice_name, 'Maged'); ?>>Maged (Arabic Male)</option>
                <option value="Tarik" <?php selected($voice_name, 'Tarik'); ?>>Tarik (Arabic Male)</option>
            </optgroup>
            <optgroup label="<?php _e('Google Voices (Web)', 'investment-advisor'); ?>">
                <option value="Google UK English Female" <?php selected($voice_name, 'Google UK English Female'); ?>>Google UK English Female</option>
                <option value="Google UK English Male" <?php selected($voice_name, 'Google UK English Male'); ?>>Google UK English Male</option>
                <option value="Google US English" <?php selected($voice_name, 'Google US English'); ?>>Google US English</option>
            </optgroup>
            <optgroup label="<?php _e('Microsoft Voices (Windows)', 'investment-advisor'); ?>">
                <option value="Microsoft Zira Desktop" <?php selected($voice_name, 'Microsoft Zira Desktop'); ?>>Zira (Windows US Female)</option>
                <option value="Microsoft David Desktop" <?php selected($voice_name, 'Microsoft David Desktop'); ?>>David (Windows US Male)</option>
                <option value="Microsoft Hazel Desktop" <?php selected($voice_name, 'Microsoft Hazel Desktop'); ?>>Hazel (Windows UK Female)</option>
            </optgroup>
        </select>
        <p class="description">
            <?php _e('Select the voice accent/language for spoken responses.', 'investment-advisor'); ?>
            <br><strong><?php _e('💡 Tip:', 'investment-advisor'); ?></strong> 
            <?php _e('Use language codes (e.g., en-GB) for maximum compatibility, or select specific voice names for fine control.', 'investment-advisor'); ?>
            <br><strong><?php _e('Note:', 'investment-advisor'); ?></strong> 
            <?php _e('Available voices depend on your device. macOS has Samantha, Daniel, etc. Windows has Microsoft voices. Chrome/Edge have Google voices.', 'investment-advisor'); ?>
        </p>
        <p class="description">
            <button type="button" id="testVoiceBtn" class="button button-secondary" onclick="testSelectedVoice()">
                <?php _e('🔊 Test Voice', 'investment-advisor'); ?>
            </button>
            <button type="button" id="listVoicesBtn" class="button button-secondary" onclick="listAvailableVoices()">
                <?php _e('📋 Show Available Voices', 'investment-advisor'); ?>
            </button>
        </p>
        <div id="voicesList" style="margin-top: 10px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; display: none; max-height: 300px; overflow-y: auto;">
            <h4 style="margin-top: 0;"><?php _e('Available Voices on This Device:', 'investment-advisor'); ?></h4>
            <div id="voicesListContent"></div>
        </div>
        <script>
        function testSelectedVoice() {
            const voiceNameOrLang = document.getElementById('investment_advisor_voice_name').value;
            const synth = window.speechSynthesis;
            const testText = 'Hello, I am your investment advisor. How can I help you today?';
            const utterance = new SpeechSynthesisUtterance(testText);
            
            // Cancel any ongoing speech
            synth.cancel();
            
            if (voiceNameOrLang) {
                const voices = synth.getVoices();
                
                // Try to find by exact name first
                let selectedVoice = voices.find(v => v.name === voiceNameOrLang);
                
                // If not found, try by language code
                if (!selectedVoice) {
                    selectedVoice = voices.find(v => v.lang === voiceNameOrLang);
                }
                
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                    utterance.lang = selectedVoice.lang;
                    console.log('Testing voice:', selectedVoice.name, '(' + selectedVoice.lang + ')');
                } else {
                    alert('Voice "' + voiceNameOrLang + '" not found on this device. Click "Show Available Voices" to see what\'s available.');
                    return;
                }
            }
            
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            synth.speak(utterance);
        }
        
        function listAvailableVoices() {
            const synth = window.speechSynthesis;
            const voices = synth.getVoices();
            const voicesList = document.getElementById('voicesList');
            const voicesListContent = document.getElementById('voicesListContent');
            
            if (voices.length === 0) {
                voicesListContent.innerHTML = '<p style="color: #d63638;">No voices loaded yet. Please wait a moment and try again.</p>';
                voicesList.style.display = 'block';
                return;
            }
            
            // Group voices by language
            const grouped = {};
            voices.forEach(voice => {
                const lang = voice.lang;
                if (!grouped[lang]) {
                    grouped[lang] = [];
                }
                grouped[lang].push(voice);
            });
            
            let html = '<table style="width: 100%; border-collapse: collapse;">';
            html += '<thead><tr style="background: #fff; border-bottom: 2px solid #ddd;"><th style="text-align: left; padding: 8px;">Voice Name</th><th style="text-align: left; padding: 8px;">Language</th><th style="text-align: center; padding: 8px;">Default</th></tr></thead>';
            html += '<tbody>';
            
            Object.keys(grouped).sort().forEach(lang => {
                grouped[lang].forEach(voice => {
                    html += '<tr style="border-bottom: 1px solid #eee;">';
                    html += '<td style="padding: 6px; font-family: monospace;">' + voice.name + '</td>';
                    html += '<td style="padding: 6px;">' + voice.lang + '</td>';
                    html += '<td style="padding: 6px; text-align: center;">' + (voice.default ? '✓' : '') + '</td>';
                    html += '</tr>';
                });
            });
            
            html += '</tbody></table>';
            html += '<p style="margin-top: 10px; color: #666; font-size: 12px;"><strong>Total:</strong> ' + voices.length + ' voices available on this device.</p>';
            
            voicesListContent.innerHTML = html;
            voicesList.style.display = 'block';
        }
        
        // Load voices on page load
        if (window.speechSynthesis) {
            // Initial load
            window.speechSynthesis.getVoices();
            
            // Handle async voice loading
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = function() {
                    window.speechSynthesis.getVoices();
                };
            }
        }
        </script>
        <?php
    }
    
    /**
     * Google API Key field callback
     */
    public function google_api_key_field_callback() {
        $api_key = get_option('investment_advisor_google_api_key', '');
        echo '<input type="password" id="investment_advisor_google_api_key" name="investment_advisor_google_api_key" value="' . esc_attr($api_key) . '" class="regular-text" />';
        
        if (!empty($api_key)) {
            echo '<p class="description" style="color: #46b450; font-weight: 500;">✅ ' . __('Google API key is configured. The chatbot can now fetch real-time information.', 'investment-advisor') . '</p>';
        } else {
            echo '<p class="description">' . __('Enter your Google Custom Search API key. Get one from <a href="https://developers.google.com/custom-search/v1/overview" target="_blank">Google Custom Search API</a>', 'investment-advisor') . '</p>';
            echo '<p class="description">' . __('This enables the chatbot to search for current information like stock prices, market news, and real-time data.', 'investment-advisor') . '</p>';
        }
    }
    
    /**
     * Google Search Engine ID field callback
     */
    public function google_search_engine_id_field_callback() {
        $search_engine_id = get_option('investment_advisor_google_search_engine_id', '');
        echo '<input type="text" id="investment_advisor_google_search_engine_id" name="investment_advisor_google_search_engine_id" value="' . esc_attr($search_engine_id) . '" class="regular-text" />';
        
        if (!empty($search_engine_id)) {
            echo '<p class="description" style="color: #46b450; font-weight: 500;">✅ ' . __('Search Engine ID is configured.', 'investment-advisor') . '</p>';
        } else {
            echo '<p class="description">' . __('Enter your Google Custom Search Engine ID. Create one at <a href="https://programmablesearchengine.google.com/" target="_blank">Programmable Search Engine</a>', 'investment-advisor') . '</p>';
        }
    }
    
    /**
     * Admin page content
     */
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('Investment Advisor Settings', 'investment-advisor'); ?></h1>
            <div class="investment-advisor-admin-container">
                <div class="investment-advisor-admin-main">
                    <form method="post" action="options.php">
                        <?php
                        settings_fields('investment_advisor_settings');
                        do_settings_sections('investment-advisor');
                        submit_button();
                        ?>
                    </form>
                </div>
                <div class="investment-advisor-admin-sidebar">
                    <div class="postbox">
                        <h3 class="hndle"><?php _e('Usage Instructions', 'investment-advisor'); ?></h3>
                        <div class="inside">
                            <h4><?php _e('Shortcode', 'investment-advisor'); ?></h4>
                            <code>[investment_advisor]</code>
                            <p><?php _e('Use this shortcode to embed the chatbot anywhere on your site, including Elementor widgets.', 'investment-advisor'); ?></p>
                            
                            <h4><?php _e('PHP Template', 'investment-advisor'); ?></h4>
                            <code>&lt;?php echo do_shortcode('[investment_advisor]'); ?&gt;</code>
                            <p><?php _e('Use this code directly in your theme template files.', 'investment-advisor'); ?></p>
                            
                            <h4><?php _e('Features', 'investment-advisor'); ?></h4>
                            <ul>
                                <li><?php _e('Text and voice input', 'investment-advisor'); ?></li>
                                <li><?php _e('English and Arabic support', 'investment-advisor'); ?></li>
                                <li><?php _e('Professional investment advice', 'investment-advisor'); ?></li>
                                <li><?php _e('Responsive design', 'investment-advisor'); ?></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Shortcode handler
     */
    public function shortcode_handler($atts) {
        $atts = shortcode_atts(array(
            'width' => '100%',
            'height' => '600px',
            'title' => '',
        ), $atts);
        
        $api_key = get_option('investment_advisor_api_key', '');
        $widget_title = get_option('investment_advisor_widget_title', 'Investment Advisor');
        $welcome_message = get_option('investment_advisor_welcome_message', 
            "Welcome! I'm your investment advisor. I can help you with financial planning and investment strategies in English or Arabic. How can I assist you today?\n\nمرحباً! أنا مستشارك المالي. يمكنني مساعدتك في التخطيط المالي واستراتيجيات الاستثمار. كيف يمكنني مساعدتك اليوم؟"
        );
        
        $default_system_prompt = "You are a highly experienced and knowledgeable investment advisor with deep expertise in financial markets, portfolio management, risk assessment, and investment strategies across global markets. You provide personalized, accurate, and actionable investment advice to clients in both English and Arabic languages. Your expertise covers stocks, bonds, ETFs, mutual funds, real estate, commodities, cryptocurrencies, and alternative investments. You always consider the client's risk tolerance, investment goals, time horizon, financial situation, and market conditions when making recommendations. You provide clear explanations, educational content, and help clients make informed investment decisions. You stay current with market trends, economic indicators, and regulatory changes. You are professional, ethical, and always act in the client's best interest while being transparent about risks and potential returns.";
        $system_prompt = get_option('investment_advisor_system_prompt', $default_system_prompt);
        
        // Auto-detect current domain and override system prompt if configured
        $current_domain = strtolower($_SERVER['HTTP_HOST']);
        
        // Check each configured domain and use its prompt if it matches
        $domain1_url = get_option('investment_advisor_domain1_name', '');
        if (!empty($domain1_url) && strpos($current_domain, strtolower($domain1_url)) !== false) {
            $domain_prompt = get_option('investment_advisor_domain1_prompt', '');
            if (!empty($domain_prompt)) {
                $system_prompt = $domain_prompt;
            }
        }
        
        $domain2_url = get_option('investment_advisor_domain2_name', '');
        if (!empty($domain2_url) && strpos($current_domain, strtolower($domain2_url)) !== false) {
            $domain_prompt = get_option('investment_advisor_domain2_prompt', '');
            if (!empty($domain_prompt)) {
                $system_prompt = $domain_prompt;
            }
        }
        
        $domain3_url = get_option('investment_advisor_domain3_name', '');
        if (!empty($domain3_url) && strpos($current_domain, strtolower($domain3_url)) !== false) {
            $domain_prompt = get_option('investment_advisor_domain3_prompt', '');
            if (!empty($domain_prompt)) {
                $system_prompt = $domain_prompt;
            }
        }
        
        $voice_name = get_option('investment_advisor_voice_name', '');
        
        // Use custom title if provided
        if (!empty($atts['title'])) {
            $widget_title = $atts['title'];
        }
        
        ob_start();
        ?>
        <div class="investment-advisor-widget-container" style="width: <?php echo esc_attr($atts['width']); ?>;">
            <div class="chatbot-widget" 
                 data-api-key="<?php echo esc_attr($api_key); ?>" 
                 data-has-api-key="<?php echo !empty($api_key) ? 'true' : 'false'; ?>" 
                 data-system-prompt="<?php echo esc_attr($system_prompt); ?>"
                 data-voice-name="<?php echo esc_attr($voice_name); ?>"
                 style="height: <?php echo esc_attr($atts['height']); ?>;">
                <div class="chatbot-header">
                    <?php if (empty($api_key)): ?>
                    <button class="config-btn" title="<?php _e('Settings', 'investment-advisor'); ?>">⚙️</button>
                    <?php endif; ?>
                    <button class="refresh-btn" title="<?php _e('Refresh page', 'investment-advisor'); ?>">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 32px; height: 32px;">
                            <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="clear-chat-btn" title="<?php _e('Clear conversation', 'investment-advisor'); ?>">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 32px; height: 32px;">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <h3><?php echo esc_html($widget_title); ?></h3>
                </div>

                <?php if (empty($api_key)): ?>
                <div class="config-panel" id="configPanel">
                    <label class="config-label"><?php _e('OpenAI API Key:', 'investment-advisor'); ?></label>
                    <input type="password" class="api-key-input" id="apiKeyInput" placeholder="<?php _e('Enter your OpenAI API key', 'investment-advisor'); ?>">
                    <div class="error-message" id="errorMessage"></div>
                    
                    <div class="config-actions">
                        <button class="config-save" onclick="saveConfig()"><?php _e('Save', 'investment-advisor'); ?></button>
                        <button class="config-cancel" onclick="toggleConfig()"><?php _e('Cancel', 'investment-advisor'); ?></button>
                    </div>
                </div>
                <?php endif; ?>

                <div class="chat-messages" id="chatMessages">
                    <div class="message assistant">
                        <div class="message-content">
                            <?php echo nl2br(esc_html($welcome_message)); ?>
                        </div>
                    </div>
                </div>

                <div class="typing-indicator" id="typingIndicator">
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>

                <div class="chat-input-container">
                    <div class="input-row" style="position: relative;">
                        <div class="listening-indicator">
                            <svg class="listening-mic-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 15C13.66 15 15 13.66 15 12V6C15 4.34 13.66 3 12 3C10.34 3 9 4.34 9 6V12C9 13.66 10.34 15 12 15Z" fill="currentColor"/>
                                <path d="M17 11C17 14.53 14.39 17.44 11 17.93V21H13C13.55 21 14 21.45 14 22C14 22.55 13.55 23 13 23H11H9C8.45 23 8 22.55 8 22C8 21.45 8.45 21 9 21H11V17.93C7.61 17.44 5 14.53 5 11H6C6 13.76 8.24 16 11 16H13C15.76 16 18 13.76 18 11H17Z" fill="currentColor"/>
                            </svg>
                        </div>
                        <input 
                            type="text" 
                            class="chat-input" 
                            id="chatInput" 
                            name="search"
                            autocomplete="off"
                            autocorrect="off"
                            autocapitalize="off"
                            spellcheck="false"
                            data-form-type="other"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            readonly 
                            onfocus="this.removeAttribute('readonly');"
                            placeholder="">
                        <button class="mic-btn" id="micBtn" title="<?php _e('Voice input', 'investment-advisor'); ?>">
                            <svg class="mic-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 15C13.66 15 15 13.66 15 12V6C15 4.34 13.66 3 12 3C10.34 3 9 4.34 9 6V12C9 13.66 10.34 15 12 15Z" fill="currentColor"/>
                                <path d="M17 11C17 14.53 14.39 17.44 11 17.93V21H13C13.55 21 14 21.45 14 22C14 22.55 13.55 23 13 23H11H9C8.45 23 8 22.55 8 22C8 21.45 8.45 21 9 21H11V17.93C7.61 17.44 5 14.53 5 11H6C6 13.76 8.24 16 11 16H13C15.76 16 18 13.76 18 11H17Z" fill="currentColor"/>
                            </svg>
                            <svg class="speaker-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 9V15C3 15.55 3.45 16 4 16H7L10.29 19.29C10.92 19.92 12 19.47 12 18.58V5.41C12 4.52 10.92 4.07 10.29 4.7L7 8H4C3.45 8 3 8.45 3 9Z" fill="currentColor"/>
                                <path d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12Z" fill="currentColor"/>
                                <path d="M14 4.45V6.54C16.89 7.86 19 10.7 19 14C19 17.3 16.89 20.14 14 21.46V23.55C18 22.17 21 18.44 21 14C21 9.56 18 5.83 14 4.45Z" fill="currentColor"/>
                            </svg>
                        </button>
                        <button class="stop-btn" id="stopBtn" title="<?php _e('Stop', 'investment-advisor'); ?>">
                            <svg class="stop-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                            </svg>
                        </button>
                        <button class="send-btn" title="<?php _e('Send message', 'investment-advisor'); ?>">
                            <svg class="send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 12L19 12M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <svg class="speaker-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 9V15C3 15.55 3.45 16 4 16H7L10.29 19.29C10.92 19.92 12 19.47 12 18.58V5.41C12 4.52 10.92 4.07 10.29 4.7L7 8H4C3.45 8 3 8.45 3 9Z" fill="currentColor"/>
                                <path d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12Z" fill="currentColor"/>
                                <path d="M14 4.45V6.54C16.89 7.86 19 10.7 19 14C19 17.3 16.89 20.14 14 21.46V23.55C18 22.17 21 18.44 21 14C21 9.56 18 5.83 14 4.45Z" fill="currentColor"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        // Set default options
        add_option('investment_advisor_widget_title', 'Investment Advisor');
        add_option('investment_advisor_welcome_message', 
            "Welcome! I'm your investment advisor. I can help you with financial planning and investment strategies in English or Arabic. How can I assist you today?\n\nمرحباً! أنا مستشارك المالي. يمكنني مساعدتك في التخطيط المالي واستراتيجيات الاستثمار. كيف يمكنني مساعدتك اليوم؟"
        );
        add_option('investment_advisor_system_prompt',
            'You are a highly experienced and knowledgeable investment advisor with deep expertise in financial markets, portfolio management, risk assessment, and investment strategies across global markets. You provide personalized, accurate, and actionable investment advice to clients in both English and Arabic languages. Your expertise covers stocks, bonds, ETFs, mutual funds, real estate, commodities, cryptocurrencies, and alternative investments. You always consider the client\'s risk tolerance, investment goals, time horizon, financial situation, and market conditions when making recommendations. You provide clear explanations, educational content, and help clients make informed investment decisions. You stay current with market trends, economic indicators, and regulatory changes. You are professional, ethical, and always act in the client\'s best interest while being transparent about risks and potential returns.'
        );
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * AJAX handler for Google search
     */
    public function ajax_google_search() {
        // Verify nonce
        check_ajax_referer('investment_advisor_nonce', 'nonce');
        
        if (!isset($_POST['query'])) {
            error_log('[Investment Advisor] Google search: No query provided');
            wp_send_json_error(array('message' => 'No search query provided'));
            return;
        }
        
        $query = sanitize_text_field($_POST['query']);
        error_log('[Investment Advisor] Google search query: ' . $query);
        
        $results = $this->perform_google_search($query);
        
        if ($results) {
            error_log('[Investment Advisor] Google search successful, ' . count($results['results']) . ' results');
            wp_send_json_success($results);
        } else {
            error_log('[Investment Advisor] Google search failed');
            wp_send_json_error(array('message' => 'Search failed - check API credentials'));
        }
    }
    
    /**
     * Perform Google Custom Search API request
     */
    private function perform_google_search($query) {
        $api_key = get_option('investment_advisor_google_api_key', '');
        $search_engine_id = get_option('investment_advisor_google_search_engine_id', '');
        
        error_log('[Investment Advisor] API Key present: ' . (!empty($api_key) ? 'YES' : 'NO'));
        error_log('[Investment Advisor] Search Engine ID present: ' . (!empty($search_engine_id) ? 'YES' : 'NO'));
        
        if (empty($api_key) || empty($search_engine_id)) {
            error_log('[Investment Advisor] Missing Google API credentials');
            return false;
        }
        
        $url = 'https://www.googleapis.com/customsearch/v1?' . http_build_query(array(
            'key' => $api_key,
            'cx' => $search_engine_id,
            'q' => $query,
            'num' => 5 // Get top 5 results
        ));
        
        error_log('[Investment Advisor] Calling Google API: ' . $url);
        
        $response = wp_remote_get($url, array(
            'timeout' => 10,
            'headers' => array(
                'Accept' => 'application/json'
            )
        ));
        
        if (is_wp_error($response)) {
            error_log('[Investment Advisor] Google Search API Error: ' . $response->get_error_message());
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        error_log('[Investment Advisor] Google API response: ' . substr($body, 0, 200));
        
        if (!isset($data['items'])) {
            error_log('[Investment Advisor] No items in Google response. Error: ' . ($data['error']['message'] ?? 'Unknown'));
            return false;
        }
        
        // Format search results
        $results = array();
        foreach ($data['items'] as $item) {
            $results[] = array(
                'title' => $item['title'] ?? '',
                'link' => $item['link'] ?? '',
                'snippet' => $item['snippet'] ?? ''
            );
        }
        
        return array(
            'query' => $query,
            'results' => $results,
            'total' => count($results)
        );
    }
    
    /**
     * Handle AJAX request for Yahoo Finance data
     */
    public function ajax_yahoo_finance() {
        // Add error logging
        error_log('[Investment Advisor] Yahoo Finance AJAX called');
        
        // Verify nonce
        if (!check_ajax_referer('investment_advisor_nonce', 'nonce', false)) {
            error_log('[Investment Advisor] Yahoo Finance - Nonce verification failed');
            wp_send_json_error(array('message' => 'Security check failed'));
            return;
        }
        
        if (!isset($_POST['symbol'])) {
            error_log('[Investment Advisor] Yahoo Finance - No symbol provided');
            wp_send_json_error(array('message' => 'No symbol provided'));
            return;
        }
        
        $symbol = sanitize_text_field($_POST['symbol']);
        error_log('[Investment Advisor] Yahoo Finance - Fetching data for: ' . $symbol);
        
        try {
        $result = $this->perform_yahoo_finance_query($symbol);
        
        if ($result) {
                error_log('[Investment Advisor] Yahoo Finance - Success for: ' . $symbol);
            wp_send_json_success(array('data' => $result));
        } else {
                error_log('[Investment Advisor] Yahoo Finance - Failed to fetch data for: ' . $symbol);
            wp_send_json_error(array('message' => 'Failed to fetch Yahoo Finance data'));
            }
        } catch (Exception $e) {
            error_log('[Investment Advisor] Yahoo Finance - Exception: ' . $e->getMessage());
            wp_send_json_error(array('message' => 'Error: ' . $e->getMessage()));
        }
    }
    
    /**
     * Perform Yahoo Finance API query for stock data
     * Uses Yahoo Finance API v8 (free, no API key required)
     * Enhanced with caching and comprehensive financial metrics
     */
    private function perform_yahoo_finance_query($symbol) {
        // Clean symbol (remove $, whitespace)
        $symbol = strtoupper(trim(str_replace('$', '', $symbol)));
        
        // Check cache first (5 minute cache for real-time data)
        $cache_key = 'yahoo_finance_' . md5($symbol);
        $cached_data = get_transient($cache_key);
        
        if ($cached_data !== false) {
            error_log('[Investment Advisor] Yahoo Finance cache hit for: ' . $symbol);
            return $cached_data;
        }
        
        error_log('[Investment Advisor] Yahoo Finance query for symbol: ' . $symbol);
        
        // Primary endpoint: Get chart data with price information
        $chart_url = 'https://query1.finance.yahoo.com/v8/finance/chart/' . urlencode($symbol) . '?interval=1d&range=1d';
        
        // Secondary endpoint: Get quote data with financial metrics
        $quote_url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' . urlencode($symbol);
        
        $user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        $request_args = array(
            'timeout' => 15,
            'headers' => array(
                'User-Agent' => $user_agent,
                'Accept' => 'application/json'
            )
        );
        
        // Make both requests in parallel
        $chart_response = wp_remote_get($chart_url, $request_args);
        $quote_response = wp_remote_get($quote_url, $request_args);
        
        $financialData = array(
            'symbol' => $symbol,
            'name' => $symbol,
            'currency' => 'USD',
            'exchange' => 'Unknown',
            'currentPrice' => null,
            'previousClose' => null,
            'change' => null,
            'changePercent' => null,
            'dayHigh' => null,
            'dayLow' => null,
            'volume' => null,
            'marketCap' => null,
            'fiftyTwoWeekHigh' => null,
            'fiftyTwoWeekLow' => null,
            'peRatio' => null,
            'eps' => null,
            'dividendYield' => null,
            'beta' => null,
            'avgVolume' => null,
            'openPrice' => null,
            'marketState' => 'UNKNOWN',
            'isMarketOpen' => false,
            'lastUpdate' => current_time('mysql')
        );
        
        // Process chart data
        if (!is_wp_error($chart_response)) {
            $chart_body = wp_remote_retrieve_body($chart_response);
            $chart_data = json_decode($chart_body, true);
            
            if (isset($chart_data['chart']['result'][0])) {
                $result = $chart_data['chart']['result'][0];
                $meta = $result['meta'] ?? array();
                $quote = $result['indicators']['quote'][0] ?? array();
                
                $financialData['symbol'] = $meta['symbol'] ?? $symbol;
                $financialData['name'] = $meta['longName'] ?? $meta['shortName'] ?? $symbol;
                $financialData['currency'] = $meta['currency'] ?? 'USD';
                $financialData['exchange'] = $meta['exchangeName'] ?? 'Unknown';
                $financialData['currentPrice'] = $meta['regularMarketPrice'] ?? $meta['chartPreviousClose'] ?? null;
                $financialData['previousClose'] = $meta['previousClose'] ?? $meta['chartPreviousClose'] ?? null;
                $financialData['dayHigh'] = $meta['regularMarketDayHigh'] ?? null;
                $financialData['dayLow'] = $meta['regularMarketDayLow'] ?? null;
                $financialData['openPrice'] = $meta['regularMarketOpen'] ?? null;
                $financialData['volume'] = end($quote['volume'] ?? []) ?? $meta['regularMarketVolume'] ?? null;
                $financialData['marketCap'] = $meta['marketCap'] ?? null;
                $financialData['fiftyTwoWeekHigh'] = $meta['fiftyTwoWeekHigh'] ?? null;
                $financialData['fiftyTwoWeekLow'] = $meta['fiftyTwoWeekLow'] ?? null;
                $financialData['marketState'] = $meta['marketState'] ?? 'UNKNOWN';
                $financialData['isMarketOpen'] = ($meta['marketState'] ?? '') === 'REGULAR';
                
                // Calculate change and change percent
                if ($financialData['currentPrice'] && $financialData['previousClose']) {
                    $financialData['change'] = $financialData['currentPrice'] - $financialData['previousClose'];
                    $financialData['changePercent'] = ($financialData['change'] / $financialData['previousClose']) * 100;
                }
            }
        } else {
            error_log('[Investment Advisor] Yahoo Finance chart API error: ' . $chart_response->get_error_message());
        }
        
        // Process quote data for additional metrics
        if (!is_wp_error($quote_response)) {
            $quote_body = wp_remote_retrieve_body($quote_response);
            $quote_data = json_decode($quote_body, true);
            
            if (isset($quote_data['quoteResponse']['result'][0])) {
                $quote_result = $quote_data['quoteResponse']['result'][0];
                
                // Extract additional financial metrics
                $financialData['peRatio'] = $quote_result['trailingPE'] ?? $quote_result['forwardPE'] ?? null;
                $financialData['eps'] = $quote_result['trailingEps'] ?? $quote_result['forwardEps'] ?? null;
                $financialData['dividendYield'] = $quote_result['dividendYield'] ?? null;
                $financialData['beta'] = $quote_result['beta'] ?? null;
                $financialData['avgVolume'] = $quote_result['averageVolume'] ?? $quote_result['averageVolume10days'] ?? null;
                
                // Update market state if available
                if (isset($quote_result['marketState'])) {
                    $financialData['marketState'] = $quote_result['marketState'];
                    $financialData['isMarketOpen'] = $quote_result['marketState'] === 'REGULAR';
                }
                
                // Fill in missing data from quote
                if (!$financialData['currentPrice'] && isset($quote_result['regularMarketPrice'])) {
                    $financialData['currentPrice'] = $quote_result['regularMarketPrice'];
                }
                if (!$financialData['previousClose'] && isset($quote_result['regularMarketPreviousClose'])) {
                    $financialData['previousClose'] = $quote_result['regularMarketPreviousClose'];
                }
                if (!$financialData['dayHigh'] && isset($quote_result['regularMarketDayHigh'])) {
                    $financialData['dayHigh'] = $quote_result['regularMarketDayHigh'];
                }
                if (!$financialData['dayLow'] && isset($quote_result['regularMarketDayLow'])) {
                    $financialData['dayLow'] = $quote_result['regularMarketDayLow'];
                }
                if (!$financialData['volume'] && isset($quote_result['regularMarketVolume'])) {
                    $financialData['volume'] = $quote_result['regularMarketVolume'];
                }
                if (!$financialData['marketCap'] && isset($quote_result['marketCap'])) {
                    $financialData['marketCap'] = $quote_result['marketCap'];
                }
                
                // Recalculate change if we got new price data
                if ($financialData['currentPrice'] && $financialData['previousClose'] && !$financialData['change']) {
                    $financialData['change'] = $financialData['currentPrice'] - $financialData['previousClose'];
                    $financialData['changePercent'] = ($financialData['change'] / $financialData['previousClose']) * 100;
                }
            }
        } else {
            error_log('[Investment Advisor] Yahoo Finance quote API error: ' . $quote_response->get_error_message());
        }
        
        // If we got no data at all, return false
        if (!$financialData['currentPrice'] && !$financialData['name']) {
            error_log('[Investment Advisor] No data retrieved for: ' . $symbol);
            return false;
        }
        
        // Cache the result for 5 minutes (300 seconds)
        set_transient($cache_key, $financialData, 300);
        
        error_log('[Investment Advisor] Yahoo Finance data retrieved for: ' . $symbol . ' - Price: ' . ($financialData['currentPrice'] ?? 'N/A') . ' - Market: ' . ($financialData['isMarketOpen'] ? 'OPEN' : 'CLOSED'));
        
        return $financialData;
    }
    
    /**
     * Handle AJAX request for historical chart data
     */
    public function ajax_chart_data() {
        // Verify nonce
        if (!check_ajax_referer('investment_advisor_nonce', 'nonce', false)) {
            wp_send_json_error(array('message' => 'Security check failed'));
            return;
        }
        
        if (!isset($_POST['symbol'])) {
            wp_send_json_error(array('message' => 'No symbol provided'));
            return;
        }
        
        $symbol = sanitize_text_field($_POST['symbol']);
        $range = isset($_POST['range']) ? sanitize_text_field($_POST['range']) : '1mo'; // Default: 1 month
        $interval = isset($_POST['interval']) ? sanitize_text_field($_POST['interval']) : '1d'; // Default: daily
        
        error_log('[Investment Advisor] Chart data request for: ' . $symbol . ' - Range: ' . $range . ' - Interval: ' . $interval);
        
        try {
            $result = $this->perform_chart_data_query($symbol, $range, $interval);
            
            if ($result) {
                wp_send_json_success(array('data' => $result));
            } else {
                wp_send_json_error(array('message' => 'Failed to fetch chart data'));
            }
        } catch (Exception $e) {
            error_log('[Investment Advisor] Chart data - Exception: ' . $e->getMessage());
            wp_send_json_error(array('message' => 'Error: ' . $e->getMessage()));
        }
    }
    
    /**
     * Fetch historical price data for charts
     * @param string $symbol - Stock symbol
     * @param string $range - Time range (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
     * @param string $interval - Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)
     */
    private function perform_chart_data_query($symbol, $range = '1mo', $interval = '1d') {
        // Clean symbol
        $symbol = strtoupper(trim(str_replace('$', '', $symbol)));
        
        // Validate range and interval
        $valid_ranges = array('1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max');
        $valid_intervals = array('1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo');
        
        if (!in_array($range, $valid_ranges)) {
            $range = '1mo';
        }
        if (!in_array($interval, $valid_intervals)) {
            $interval = '1d';
        }
        
        // Check cache (10 minute cache for chart data)
        $cache_key = 'yahoo_chart_' . md5($symbol . $range . $interval);
        $cached_data = get_transient($cache_key);
        
        if ($cached_data !== false) {
            error_log('[Investment Advisor] Chart data cache hit for: ' . $symbol);
            return $cached_data;
        }
        
        // Yahoo Finance chart API endpoint
        $url = 'https://query1.finance.yahoo.com/v8/finance/chart/' . urlencode($symbol) . '?interval=' . urlencode($interval) . '&range=' . urlencode($range);
        
        error_log('[Investment Advisor] Fetching chart data from: ' . $url);
        
        $user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        $response = wp_remote_get($url, array(
            'timeout' => 15,
            'headers' => array(
                'User-Agent' => $user_agent,
                'Accept' => 'application/json'
            )
        ));
        
        if (is_wp_error($response)) {
            error_log('[Investment Advisor] Chart API error: ' . $response->get_error_message());
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!isset($data['chart']['result'][0])) {
            error_log('[Investment Advisor] Invalid chart response for: ' . $symbol);
            return false;
        }
        
        $result = $data['chart']['result'][0];
        $meta = $result['meta'] ?? array();
        $timestamps = $result['timestamp'] ?? array();
        $quote = $result['indicators']['quote'][0] ?? array();
        
        // Extract price data
        $prices = $quote['close'] ?? array();
        $highs = $quote['high'] ?? array();
        $lows = $quote['low'] ?? array();
        $opens = $quote['open'] ?? array();
        $volumes = $quote['volume'] ?? array();
        
        // Format data for charting
        $chartData = array(
            'symbol' => $meta['symbol'] ?? $symbol,
            'name' => $meta['longName'] ?? $meta['shortName'] ?? $symbol,
            'currency' => $meta['currency'] ?? 'USD',
            'range' => $range,
            'interval' => $interval,
            'dataPoints' => array(),
            'currentPrice' => $meta['regularMarketPrice'] ?? null,
            'previousClose' => $meta['previousClose'] ?? null
        );
        
        // Combine timestamps with price data
        for ($i = 0; $i < count($timestamps); $i++) {
            if (isset($prices[$i]) && $prices[$i] !== null) {
                $chartData['dataPoints'][] = array(
                    'timestamp' => $timestamps[$i],
                    'date' => date('Y-m-d H:i:s', $timestamps[$i]),
                    'price' => $prices[$i],
                    'high' => $highs[$i] ?? null,
                    'low' => $lows[$i] ?? null,
                    'open' => $opens[$i] ?? null,
                    'volume' => $volumes[$i] ?? null
                );
            }
        }
        
        // Cache for 10 minutes (600 seconds)
        set_transient($cache_key, $chartData, 600);
        
        error_log('[Investment Advisor] Chart data retrieved: ' . count($chartData['dataPoints']) . ' data points for ' . $symbol);
        
        return $chartData;
    }
}

// Initialize the plugin
new InvestmentAdvisorPlugin();