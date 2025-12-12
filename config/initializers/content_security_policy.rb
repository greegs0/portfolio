# Be sure to restart your server when you modify this file.

# Define an application-wide content security policy.
# See the Securing Rails Applications Guide for more information:
# https://guides.rubyonrails.org/security.html#content-security-policy-header

Rails.application.configure do
  config.content_security_policy do |policy|
    policy.default_src :self
    policy.font_src    :self, :data, "https://cdnjs.cloudflare.com"
    policy.img_src     :self, :data, "https://i.ytimg.com", "https://img.youtube.com"
    policy.object_src  :none
    policy.script_src  :self, :unsafe_inline, :unsafe_eval
    policy.style_src   :self, :unsafe_inline, "https://cdnjs.cloudflare.com"
    policy.frame_src   :self, "https://www.youtube.com", "https://www.youtube-nocookie.com"
    policy.connect_src :self
    policy.base_uri    :self
    policy.form_action :self
    policy.frame_ancestors :none
    policy.upgrade_insecure_requests
  end

  # Note: unsafe_inline is required for Tailwind CSS and Stimulus inline handlers
  # In a future iteration, consider implementing nonce-based CSP with Rails helpers
end
