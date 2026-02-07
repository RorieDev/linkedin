<?php
/**
 * Plugin Name: Investing Copilot Widget
 * Description: Embeds the Investing Copilot voice assistant built with Gemini.
 * Version: 4.3.0
 * Author: Rorie Devine
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!defined('INVESTING_COPILOT_WIDGET_VERSION')) {
    define('INVESTING_COPILOT_WIDGET_VERSION', '4.3.0');
}

class InvestingCopilotWidget {
    public function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_shortcode('investing_copilot', array($this, 'render_widget'));
        add_action('admin_menu', array($this, 'register_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('rest_api_init', array($this, 'register_yahoo_finance_proxy'));
        add_action('rest_api_init', array($this, 'register_google_search_proxy'));
        add_action('rest_api_init', array($this, 'register_investor_profile_endpoints'));
        add_action('rest_api_init', array($this, 'register_chat_history_endpoints'));
        add_action('rest_api_init', array($this, 'register_auth_endpoints'));
        register_activation_hook(__FILE__, array($this, 'create_investor_profile_table'));
        register_activation_hook(__FILE__, array($this, 'create_chat_history_table'));
        // Hide WordPress admin bar for all users on front-end
        add_filter('show_admin_bar', '__return_false');
    }
    
    /**
     * Create investor profile table on plugin activation
     */
    public function create_investor_profile_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'investor_profiles';
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            risk_tolerance_score int(11) NOT NULL DEFAULT 0,
            investment_goals text NOT NULL,
            questionnaire_answers longtext NOT NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY user_id (user_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Create chat history table on plugin activation
     */
    public function create_chat_history_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'copilot_chat_history';
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            message_id varchar(255) NOT NULL,
            speaker varchar(20) NOT NULL,
            text longtext NOT NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    public function register_yahoo_finance_proxy() {
        register_rest_route('yahoo-finance/v1', '/chart/(?P<ticker>[A-Z0-9.\-^]+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'proxy_yahoo_finance'),
            'permission_callback' => '__return_true',
            'args' => array(
                'ticker' => array(
                    'required' => true,
                    'validate_callback' => function($param) {
                        // Allow uppercase letters, numbers, periods, hyphens, and carets (for indices like ^GSPC)
                        return preg_match('/^[A-Z0-9.\-^]+$/', $param);
                    }
                ),
                'period1' => array(
                    'required' => true,
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    }
                ),
                'period2' => array(
                    'required' => true,
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    }
                ),
                'interval' => array(
                    'required' => true,
                    'validate_callback' => function($param) {
                        return in_array($param, array('1d', '1wk', '1mo'));
                    }
                ),
            ),
        ));
    }
    
    public function proxy_yahoo_finance($request) {
        $ticker = $request->get_param('ticker');
        $period1 = $request->get_param('period1');
        $period2 = $request->get_param('period2');
        $interval = $request->get_param('interval');
        
        $url = sprintf(
            'https://query1.finance.yahoo.com/v8/finance/chart/%s?period1=%s&period2=%s&interval=%s',
            $ticker,
            $period1,
            $period2,
            $interval
        );
        
        $response = wp_remote_get($url, array(
            'timeout' => 15,
            'headers' => array(
                'Accept' => 'application/json',
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
        ));
        
        if (is_wp_error($response)) {
            return new WP_Error('yahoo_finance_error', $response->get_error_message(), array('status' => 500));
        }
        
        $body = wp_remote_retrieve_body($response);
        $status_code = wp_remote_retrieve_response_code($response);
        
        return new WP_REST_Response(json_decode($body), $status_code);
    }
    
    public function register_google_search_proxy() {
        register_rest_route('google-search/v1', '/search', array(
            'methods' => 'GET',
            'callback' => array($this, 'proxy_google_search'),
            'permission_callback' => '__return_true',
            'args' => array(
                'query' => array(
                    'required' => true,
                    'validate_callback' => function($param) {
                        return !empty(trim($param));
                    }
                ),
            ),
        ));
    }
    
    public function proxy_google_search($request) {
        $query = $request->get_param('query');
        $api_key = get_option('investing_copilot_google_api_key', '');
        $search_engine_id = get_option('investing_copilot_google_search_engine_id', '');
        
        if (empty($api_key) || empty($search_engine_id)) {
            return new WP_Error(
                'google_search_config_error',
                'Google Search API credentials not configured',
                array('status' => 500)
            );
        }
        
        $url = 'https://www.googleapis.com/customsearch/v1?' . http_build_query(array(
            'key' => $api_key,
            'cx' => $search_engine_id,
            'q' => $query,
            'num' => 6
        ));
        
        $response = wp_remote_get($url, array(
            'timeout' => 10,
            'headers' => array(
                'Accept' => 'application/json'
            )
        ));
        
        if (is_wp_error($response)) {
            return new WP_Error('google_search_error', $response->get_error_message(), array('status' => 500));
        }
        
        $body = wp_remote_retrieve_body($response);
        $status_code = wp_remote_retrieve_response_code($response);
        $data = json_decode($body, true);
        
        if ($status_code !== 200) {
            return new WP_Error('google_search_api_error', 'Google Search API error', array('status' => $status_code));
        }
        
        // Format results for easier consumption
        $formatted_results = array(
            'query' => $query,
            'results' => array()
        );
        
        if (isset($data['items']) && is_array($data['items'])) {
            foreach ($data['items'] as $item) {
                $formatted_results['results'][] = array(
                    'title' => isset($item['title']) ? $item['title'] : '',
                    'link' => isset($item['link']) ? $item['link'] : '',
                    'snippet' => isset($item['snippet']) ? $item['snippet'] : '',
                );
            }
        }
        
        return new WP_REST_Response($formatted_results, 200);
    }
    
    /**
     * Register REST API endpoints for investor profiles
     */
    public function register_investor_profile_endpoints() {
        // Get or create investor profile
        register_rest_route('investor-profile/v1', '/profile', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_investor_profile'),
            'permission_callback' => array($this, 'check_user_logged_in')
        ));
        
        // Create or update investor profile
        register_rest_route('investor-profile/v1', '/profile', array(
            'methods' => 'POST',
            'callback' => array($this, 'save_investor_profile'),
            'permission_callback' => array($this, 'check_user_logged_in'),
            'args' => array(
                'risk_tolerance_score' => array(
                    'required' => true,
                    'type' => 'integer',
                    'minimum' => 0,
                    'maximum' => 10
                ),
                'investment_goals' => array(
                    'required' => true,
                    'type' => 'string'
                ),
                'questionnaire_answers' => array(
                    'required' => true,
                    'type' => 'object'
                )
            )
        ));
    }
    
    /**
     * Check if user is logged in for REST API requests
     */
    public function check_user_logged_in($request) {
        return is_user_logged_in();
    }
    
    /**
     * Register authentication endpoints
     */
    public function register_auth_endpoints() {
        // Get current user status
        register_rest_route('copilot-auth/v1', '/status', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_auth_status'),
            'permission_callback' => '__return_true'
        ));
        
        // Direct logout action
        register_rest_route('copilot-auth/v1', '/logout', array(
            'methods' => 'POST',
            'callback' => array($this, 'handle_logout'),
            'permission_callback' => '__return_true'
        ));
        
        // Get Google login URL
        register_rest_route('copilot-auth/v1', '/google-login-url', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_google_login_url'),
            'permission_callback' => '__return_true'
        ));
    }
    
    /**
     * Get authentication status and user info
     */
    public function get_auth_status($request) {
        $user_id = get_current_user_id();
        
        if (!$user_id) {
            return new WP_REST_Response(array(
                'logged_in' => false,
                'user_id' => null,
                'display_name' => null
            ), 200);
        }
        
        $user = wp_get_current_user();
        
        return new WP_REST_Response(array(
            'logged_in' => true,
            'user_id' => $user_id,
            'display_name' => $user->display_name,
            'email' => $user->user_email
        ), 200);
    }
    
    /**
     * Handle direct logout without confirmation screen
     */
    public function handle_logout($request) {
        // Log the user out
        wp_logout();
        
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Logged out successfully'
        ), 200);
    }
    
    /**
     * Get Google login URL via NextendSocial Login
     */
    public function get_google_login_url($request) {
        // Check if NextendSocial Login is active
        if (class_exists('NextendSocialLogin')) {
            // Get the provider
            $providers = NextendSocialLogin::$enabledProviders;
            if (isset($providers['google'])) {
                $provider = $providers['google'];
                $login_url = $provider->getLoginUrl();
                
                return new WP_REST_Response(array(
                    'login_url' => $login_url,
                    'method' => 'nextend'
                ), 200);
            }
        }
        
        // Fallback to standard URL
        $login_url = wp_login_url() . '?loginSocial=google';
        
        return new WP_REST_Response(array(
            'login_url' => $login_url,
            'method' => 'fallback'
        ), 200);
    }
    
    /**
     * Get investor profile for a user
     */
    public function get_investor_profile($request) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'investor_profiles';
        
        // Use current logged-in WordPress user
        $user_id = get_current_user_id();
        
        if (!$user_id) {
            return new WP_Error(
                'not_logged_in',
                'You must be logged in to access your investor profile',
                array('status' => 401)
            );
        }
        
        $profile = $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM $table_name WHERE user_id = %d", $user_id),
            ARRAY_A
        );
        
        if (!$profile) {
            return new WP_REST_Response(array(
                'exists' => false,
                'user_id' => $user_id,
                'message' => 'No investor profile found for this user'
            ), 404);
        }
        
        // Parse JSON questionnaire answers
        $profile['questionnaire_answers'] = json_decode($profile['questionnaire_answers'], true);
        $profile['exists'] = true;
        
        return new WP_REST_Response($profile, 200);
    }
    
    /**
     * Save or update investor profile
     */
    public function save_investor_profile($request) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'investor_profiles';
        
        // Use current logged-in WordPress user
        $user_id = get_current_user_id();
        
        if (!$user_id) {
            return new WP_Error(
                'not_logged_in',
                'You must be logged in to save your investor profile',
                array('status' => 401)
            );
        }
        
        $risk_tolerance_score = $request->get_param('risk_tolerance_score');
        $investment_goals = $request->get_param('investment_goals');
        $questionnaire_answers = $request->get_param('questionnaire_answers');
        
        // Encode questionnaire answers as JSON
        $answers_json = json_encode($questionnaire_answers);
        
        // Check if profile exists
        $existing = $wpdb->get_var(
            $wpdb->prepare("SELECT id FROM $table_name WHERE user_id = %d", $user_id)
        );
        
        if ($existing) {
            // Update existing profile
            $result = $wpdb->update(
                $table_name,
                array(
                    'risk_tolerance_score' => $risk_tolerance_score,
                    'investment_goals' => $investment_goals,
                    'questionnaire_answers' => $answers_json
                ),
                array('user_id' => $user_id),
                array('%d', '%s', '%s'),
                array('%d')
            );
            
            if ($result === false) {
                return new WP_Error('update_failed', 'Failed to update investor profile', array('status' => 500));
            }
            
            return new WP_REST_Response(array(
                'success' => true,
                'message' => 'Investor profile updated successfully',
                'user_id' => $user_id,
                'profile_id' => $existing,
                'risk_tolerance_score' => $risk_tolerance_score,
                'risk_level' => $this->get_risk_level($risk_tolerance_score)
            ), 200);
        } else {
            // Create new profile
            $result = $wpdb->insert(
                $table_name,
                array(
                    'user_id' => $user_id,
                    'risk_tolerance_score' => $risk_tolerance_score,
                    'investment_goals' => $investment_goals,
                    'questionnaire_answers' => $answers_json
                ),
                array('%d', '%d', '%s', '%s')
            );
            
            if ($result === false) {
                return new WP_Error('insert_failed', 'Failed to create investor profile', array('status' => 500));
            }
            
            return new WP_REST_Response(array(
                'success' => true,
                'message' => 'Investor profile created successfully',
                'user_id' => $user_id,
                'profile_id' => $wpdb->insert_id,
                'risk_tolerance_score' => $risk_tolerance_score,
                'risk_level' => $this->get_risk_level($risk_tolerance_score)
            ), 201);
        }
    }
    
    /**
     * Get risk level label from score
     */
    private function get_risk_level($score) {
        if ($score >= 0 && $score <= 3) {
            return 'Conservative (Low Risk)';
        } elseif ($score >= 4 && $score <= 6) {
            return 'Moderate (Medium Risk)';
        } elseif ($score >= 7 && $score <= 10) {
            return 'Aggressive (High Risk)';
        }
        return 'Unknown';
    }
    
    /**
     * Register REST API endpoints for chat history
     */
    public function register_chat_history_endpoints() {
        // Get chat history
        register_rest_route('chat-history/v1', '/messages', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_chat_history'),
            'permission_callback' => array($this, 'check_user_logged_in')
        ));
        
        // Save chat message
        register_rest_route('chat-history/v1', '/messages', array(
            'methods' => 'POST',
            'callback' => array($this, 'save_chat_message'),
            'permission_callback' => array($this, 'check_user_logged_in'),
            'args' => array(
                'message_id' => array(
                    'required' => true,
                    'type' => 'string'
                ),
                'speaker' => array(
                    'required' => true,
                    'type' => 'string'
                ),
                'text' => array(
                    'required' => true,
                    'type' => 'string'
                )
            )
        ));
        
        // Clear chat history
        register_rest_route('chat-history/v1', '/messages', array(
            'methods' => 'DELETE',
            'callback' => array($this, 'clear_chat_history'),
            'permission_callback' => array($this, 'check_user_logged_in')
        ));
    }
    
    /**
     * Get chat history for current user
     */
    public function get_chat_history($request) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'copilot_chat_history';
        
        $user_id = get_current_user_id();
        
        if (!$user_id) {
            return new WP_Error(
                'not_logged_in',
                'You must be logged in to access chat history',
                array('status' => 401)
            );
        }
        
        // Get last 50 messages, ordered by creation time
        $messages = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT message_id as id, speaker, text, created_at 
                FROM $table_name 
                WHERE user_id = %d 
                ORDER BY created_at ASC 
                LIMIT 50",
                $user_id
            ),
            ARRAY_A
        );
        
        return new WP_REST_Response(array(
            'messages' => $messages ? $messages : array(),
            'count' => count($messages)
        ), 200);
    }
    
    /**
     * Save a chat message
     */
    public function save_chat_message($request) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'copilot_chat_history';
        
        $user_id = get_current_user_id();
        
        if (!$user_id) {
            return new WP_Error(
                'not_logged_in',
                'You must be logged in to save chat messages',
                array('status' => 401)
            );
        }
        
        $message_id = $request->get_param('message_id');
        $speaker = $request->get_param('speaker');
        $text = $request->get_param('text');
        
        // Insert message
        $result = $wpdb->insert(
            $table_name,
            array(
                'user_id' => $user_id,
                'message_id' => $message_id,
                'speaker' => $speaker,
                'text' => $text
            ),
            array('%d', '%s', '%s', '%s')
        );
        
        if ($result === false) {
            return new WP_Error('insert_failed', 'Failed to save chat message', array('status' => 500));
        }
        
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Chat message saved successfully',
            'id' => $wpdb->insert_id
        ), 201);
    }
    
    /**
     * Clear all chat history for current user
     */
    public function clear_chat_history($request) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'copilot_chat_history';
        
        $user_id = get_current_user_id();
        
        if (!$user_id) {
            return new WP_Error(
                'not_logged_in',
                'You must be logged in to clear chat history',
                array('status' => 401)
            );
        }
        
        $result = $wpdb->delete(
            $table_name,
            array('user_id' => $user_id),
            array('%d')
        );
        
        if ($result === false) {
            return new WP_Error('delete_failed', 'Failed to clear chat history', array('status' => 500));
        }
        
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Chat history cleared successfully',
            'deleted_count' => $result
        ), 200);
    }

    public function enqueue_assets() {
        if (!$this->has_gemini_key()) {
            return;
        }

        // Find the actual built JS and CSS files in the assets directory
        $assets_dir = plugin_dir_path(__FILE__) . 'build/assets/';
        $assets_url = plugin_dir_url(__FILE__) . 'build/assets/';
        
        $script_path = '';
        $css_path = '';
        
        if (is_dir($assets_dir)) {
            $files = scandir($assets_dir);
            foreach ($files as $file) {
                if (preg_match('/^index-[a-zA-Z0-9_-]+\.js$/', $file)) {
                    $script_path = $assets_dir . $file;
                }
                if (preg_match('/^index-[a-zA-Z0-9_-]+\.css$/', $file)) {
                    $css_path = $assets_dir . $file;
                }
            }
        }
        
        if (!file_exists($script_path)) {
            return;
        }

        $script_url = $assets_url . basename($script_path);
        $css_url = $assets_url . basename($css_path);
        
        // Use timestamp + random to force cache busting
        $version = INVESTING_COPILOT_WIDGET_VERSION . '-' . filemtime($script_path) . '-' . time() . '-' . wp_rand();

        // Enqueue CSS if it exists
        if (file_exists($css_path)) {
            wp_enqueue_style(
                'investing-copilot-widget-styles',
                $css_url,
                array(),
                $version
            );
        }

        wp_enqueue_script(
            'investing-copilot-widget',
            $script_url,
            array(),
            $version,
            true
        );

        $config = array(
            'containerId' => 'investing-copilot-root',
            'geminiApiKey' => $this->get_gemini_key(),
            'alpacaProxyUrl' => $this->get_alpaca_proxy_url(),
            'userPrompt' => $this->get_user_prompt(),
            'systemPrompt' => $this->get_system_prompt(),
            'restNonce' => wp_create_nonce('wp_rest'), // Add REST API nonce for authenticated requests
        );

        wp_localize_script('investing-copilot-widget', 'INVESTING_COPILOT_CONFIG', $config);
    }

    public function render_widget() {
        if (!wp_script_is('investing-copilot-widget', 'enqueued')) {
            $this->enqueue_assets();
        }

        // Force CSS to load inline as fallback - find the actual CSS file
        $assets_dir = plugin_dir_path(__FILE__) . 'build/assets/';
        $inline_css = '';
        
        if (is_dir($assets_dir)) {
            $files = scandir($assets_dir);
            foreach ($files as $file) {
                if (preg_match('/^index-[a-zA-Z0-9_-]+\.css$/', $file)) {
                    $css_path = $assets_dir . $file;
                    if (file_exists($css_path)) {
                        $inline_css = file_get_contents($css_path);
                    }
                    break;
                }
            }
        }

        ob_start();
        ?>
        <?php if ($inline_css): ?>
        <style><?php echo $inline_css; ?></style>
        <?php endif; ?>
        <div id="investing-copilot-root" class="investing-copilot-widget" style="width: 100%; min-height: auto; border: none; border-radius: 0; overflow: visible;"></div>
        <script>
            (function initInvestingCopilot() {
                if (typeof window.createFinancialAssistantWidget === 'function') {
                    window.createFinancialAssistantWidget(INVESTING_COPILOT_CONFIG.containerId || 'investing-copilot-root');
                } else {
                    setTimeout(initInvestingCopilot, 100);
                }
            })();
        </script>
        <?php
        return ob_get_clean();
    }

    public function register_settings_page() {
        add_options_page(
            __('Investing Copilot', 'investing-copilot'),
            __('Investing Copilot', 'investing-copilot'),
            'manage_options',
            'investing-copilot',
            array($this, 'render_settings_page')
        );
    }

    public function register_settings() {
        register_setting('investing_copilot_settings', 'investing_copilot_gemini_api_key');
        register_setting('investing_copilot_settings', 'investing_copilot_alpaca_proxy_url');
        register_setting('investing_copilot_settings', 'investing_copilot_user_prompt');
        register_setting('investing_copilot_settings', 'investing_copilot_system_prompt');
        register_setting('investing_copilot_settings', 'investing_copilot_google_api_key');
        register_setting('investing_copilot_settings', 'investing_copilot_google_search_engine_id');

        add_settings_section(
            'investing_copilot_main',
            __('API Configuration', 'investing-copilot'),
            function () {
                echo '<p>' . esc_html__('Provide the credentials used by the Investing Copilot widget.', 'investing-copilot') . '</p>';
            },
            'investing-copilot'
        );

        add_settings_field(
            'investing_copilot_gemini_api_key',
            __('Gemini API Key', 'investing-copilot'),
            array($this, 'render_gemini_key_field'),
            'investing-copilot',
            'investing_copilot_main'
        );

        add_settings_field(
            'investing_copilot_alpaca_proxy_url',
            __('Alpaca Proxy URL', 'investing-copilot'),
            array($this, 'render_alpaca_url_field'),
            'investing-copilot',
            'investing_copilot_main'
        );

        add_settings_field(
            'investing_copilot_user_prompt',
            __('User Prompt', 'investing-copilot'),
            array($this, 'render_user_prompt_field'),
            'investing-copilot',
            'investing_copilot_main'
        );

        add_settings_field(
            'investing_copilot_system_prompt',
            __('System Prompt', 'investing-copilot'),
            array($this, 'render_system_prompt_field'),
            'investing-copilot',
            'investing_copilot_main'
        );

        add_settings_field(
            'investing_copilot_google_api_key',
            __('Google Custom Search API Key', 'investing-copilot'),
            array($this, 'render_google_api_key_field'),
            'investing-copilot',
            'investing_copilot_main'
        );

        add_settings_field(
            'investing_copilot_google_search_engine_id',
            __('Google Search Engine ID', 'investing-copilot'),
            array($this, 'render_google_search_engine_id_field'),
            'investing-copilot',
            'investing_copilot_main'
        );
    }

    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('Investing Copilot Settings', 'investing-copilot'); ?></h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('investing_copilot_settings');
                do_settings_sections('investing-copilot');
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }

    public function render_gemini_key_field() {
        $value = esc_attr($this->get_gemini_key());
        echo '<input type="password" name="investing_copilot_gemini_api_key" value="' . $value . '" class="regular-text" />';
        if ($value) {
            echo '<p class="description" style="color:#46b450;">' . esc_html__('Gemini API key is configured.', 'investing-copilot') . '</p>';
        } else {
            echo '<p class="description">' . esc_html__('Enter the server-side Gemini API key used for live conversations.', 'investing-copilot') . '</p>';
        }
    }

    public function render_alpaca_url_field() {
        $value = esc_url($this->get_alpaca_proxy_url());
        echo '<input type="url" name="investing_copilot_alpaca_proxy_url" value="' . $value . '" class="regular-text" />';
        echo '<p class="description">' . esc_html__('Defaults to your site\'s /wp-json/alpaca/v1 endpoint.', 'investing-copilot') . '</p>';
    }

    public function render_user_prompt_field() {
        $value = get_option('investing_copilot_user_prompt', '');
        echo '<textarea name="investing_copilot_user_prompt" rows="4" class="large-text code">' . esc_textarea($value) . '</textarea>';
        echo '<p class="description">' . esc_html__('User context/information to include in the system prompt (e.g., portfolio holdings, preferences).', 'investing-copilot') . '</p>';
    }

    public function render_system_prompt_field() {
        $value = get_option('investing_copilot_system_prompt', '');
        echo '<textarea name="investing_copilot_system_prompt" rows="6" class="large-text code">' . esc_textarea($value) . '</textarea>';
        echo '<p class="description">' . esc_html__('Custom system prompt for the AI. Leave blank for default.', 'investing-copilot') . '</p>';
    }

    public function render_google_api_key_field() {
        $value = get_option('investing_copilot_google_api_key', '');
        echo '<input type="password" name="investing_copilot_google_api_key" value="' . esc_attr($value) . '" class="regular-text" />';
        if ($value) {
            echo '<p class="description" style="color:#46b450;">' . esc_html__('✓ Google Search API key is configured.', 'investing-copilot') . '</p>';
        } else {
            echo '<p class="description">' . esc_html__('Optional: Get your API key from ', 'investing-copilot') . '<a href="https://console.cloud.google.com/apis/credentials" target="_blank">Google Cloud Console</a></p>';
        }
    }

    public function render_google_search_engine_id_field() {
        $value = get_option('investing_copilot_google_search_engine_id', '');
        echo '<input type="text" name="investing_copilot_google_search_engine_id" value="' . esc_attr($value) . '" class="regular-text" />';
        if ($value) {
            echo '<p class="description" style="color:#46b450;">' . esc_html__('✓ Search Engine ID is configured.', 'investing-copilot') . '</p>';
        } else {
            echo '<p class="description">' . esc_html__('Optional: Create a Custom Search Engine at ', 'investing-copilot') . '<a href="https://programmablesearchengine.google.com/" target="_blank">Programmable Search Engine</a></p>';
        }
    }

    private function has_gemini_key(): bool {
        return !empty($this->get_gemini_key());
    }

    private function get_gemini_key(): string {
        $key = get_option('investing_copilot_gemini_api_key', '');
        if (!empty($key)) {
            return $key;
        }
        if (defined('INVESTING_COPILOT_GEMINI_API_KEY')) {
            return INVESTING_COPILOT_GEMINI_API_KEY;
        }
        $legacy = get_option('investment_advisor_api_key', '');
        return $legacy;
    }

    private function get_alpaca_proxy_url(): string {
        $url = trim(get_option('investing_copilot_alpaca_proxy_url', ''));
        if (!empty($url)) {
            return untrailingslashit($url);
        }
        if (defined('INVESTING_COPILOT_ALPACA_PROXY_URL')) {
            return untrailingslashit(INVESTING_COPILOT_ALPACA_PROXY_URL);
        }
        return untrailingslashit(home_url('/wp-json/alpaca/v1'));
    }

    private function get_user_prompt(): string {
        return trim(get_option('investing_copilot_user_prompt', ''));
    }

    private function get_system_prompt(): string {
        $prompt = get_option('investing_copilot_system_prompt', '');
        if (!empty($prompt)) {
            return $prompt;
        }
        
        // Default system prompt
        $default = 'You are a friendly and helpful financial assistant. ';
        $default .= 'You can explain financial concepts, show stock price charts, check account summaries, view portfolio composition, execute trades, search the web for real-time information, generate custom charts, and manage investor profiles. ';
        $default .= 'IMPORTANT: When asked about stock prices, ALWAYS use the getStockPrice tool to display a visual chart. ';
        $default .= 'After using getStockPrice, DO NOT ask if they want to see a chart - the chart is ALREADY displayed above your response. ';
        $default .= 'Simply provide the current price information and any relevant analysis. ';
        $default .= 'When asked to buy or sell stocks, use the executeTrade tool. ';
        $default .= 'When asked about account balance or buying power, use the getAccountSummary tool. ';
        $default .= 'When asked about portfolio holdings, positions, or composition, use the getPortfolioComposition tool to display a detailed table of current holdings with quantities, values, and performance. ';
        $default .= 'When asked about current market news, recent company announcements, or time-sensitive financial events, use the googleSearch tool to find up-to-date information. ';
        $default .= 'For general investing concepts and educational questions (like "what is a bond", "how does diversification work"), answer directly using your knowledge without searching. ';
        $default .= 'When asked to visualize portfolio composition or data distribution, use the generateChart tool to create a pie chart. ';
        $default .= 'For generateChart, provide: title (string), data (comma-separated numbers), and labels (comma-separated names). Example: title="Portfolio", data="1879.29,1678.20,4351.97", labels="AAPL,GOOG,META". ';
        $default .= "\n\n";
        $default .= '## INVESTOR PROFILE & RISK TOLERANCE ##' . "\n";
        $default .= 'You can help users create and manage their investor profile, which includes their risk tolerance and investment goals. ';
        $default .= 'To check if a user has a profile, use getInvestorProfile. ';
        $default .= 'If they don\'t have a profile or want to update it, guide them through these 10 YES/NO questions in a CONVERSATIONAL and FRIENDLY way (ONE question at a time):' . "\n\n";
        $default .= '1. Have you ever invested in assets that can go up and down in value (e.g., stocks, ETFs, crypto)?' . "\n";
        $default .= '2. Would you feel comfortable seeing your investment drop 20% in a short period without selling?' . "\n";
        $default .= '3. Is long-term growth more important to you than protecting your capital at all times?' . "\n";
        $default .= '4. Do you prefer investments with higher potential returns even if they carry higher risk?' . "\n";
        $default .= '5. Are you willing to hold an investment for at least 5 years?' . "\n";
        $default .= '6. Would you feel confident making your own changes to an investment plan?' . "\n";
        $default .= '7. Are you comfortable with the idea that you could lose money in pursuit of higher returns?' . "\n";
        $default .= '8. When markets fall, do you tend to stay invested rather than sell?' . "\n";
        $default .= '9. Would you accept short-term volatility if the long-term outlook is strong?' . "\n";
        $default .= '10. Do you consider yourself good at handling financial uncertainty?' . "\n\n";
        $default .= 'After the 10 questions, ask them to describe their investment goals (e.g., retirement, wealth building, passive income). ';
        $default .= 'SCORING: Each YES = 1 point, each NO = 0 points. Risk tolerance score is the total (0-10). ';
        $default .= '0-3 = Conservative (Low Risk), 4-6 = Moderate (Medium Risk), 7-10 = Aggressive (High Risk). ';
        $default .= 'After collecting all answers and goals, use saveInvestorProfile with: user_id=1, risk_tolerance_score (the total score), investment_goals (their stated goals), questionnaire_answers (JSON object with keys q1-q10 and boolean values). ';
        $default .= 'Example: {"q1": true, "q2": false, "q3": true, "q4": true, "q5": true, "q6": false, "q7": true, "q8": true, "q9": true, "q10": false}. ';
        $default .= 'Once the profile is saved, use it to provide personalized investment advice tailored to their risk level and goals. ';
        $default .= 'Be warm, encouraging, and explain what their risk score means in practical terms.' . "\n\n";
        $default .= 'You have full access to execute trades via Alpaca paper trading, search the web for up-to-date information, create dynamic visualizations, and manage personalized investor profiles.';
        
        return $default;
    }
}

new InvestingCopilotWidget();

