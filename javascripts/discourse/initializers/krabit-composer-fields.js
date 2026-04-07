// KRABIT Composer Fields
// Uses Discourse's official plugin outlets via plugin API

import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "krabit-composer-fields",
  initialize() {
    withPluginApi("0.8.31", (api) => {

      // ─── Get allowed category IDs from theme settings ──────────────────
      function getAllowedCategoryIds() {
        const raw = settings.krabit_category_ids || "";
        return raw
          .split(",")
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !isNaN(id) && id > 0);
      }

      function isAllowedCategory(categoryId) {
        const allowed = getAllowedCategoryIds();
        if (allowed.length === 0) return false;
        return allowed.includes(parseInt(categoryId, 10));
      }

      // ─── Inject fields below the title input ──────────────────────────
      api.modifyClass("component:composer-editor", {
        pluginId: "krabit-composer-fields",

        didInsertElement() {
          this._super(...arguments);
          this._insertKrabitFields();

          // Watch for category changes
          this._krabitCategoryWatcher = setInterval(() => {
            this._insertKrabitFields();
          }, 500);
        },

        willDestroyElement() {
          this._super(...arguments);
          clearInterval(this._krabitCategoryWatcher);
          const el = document.getElementById("krabit-composer-fields");
          if (el) el.remove();
        },

        _insertKrabitFields() {
          const model = this.get("composer");
          if (!model) return;

          const categoryId = model.get("categoryId");
          const existing = document.getElementById("krabit-composer-fields");

          if (!isAllowedCategory(categoryId)) {
            if (existing) existing.remove();
            return;
          }

          if (existing) return; // Already injected

          // Find the title input area as anchor point
          const titleInput =
            document.querySelector(".title-input") ||
            document.querySelector(".composer-fields") ||
            document.querySelector(".d-editor");

          if (!titleInput) return;

          const wrapper = document.createElement("div");
          wrapper.id = "krabit-composer-fields";
          wrapper.className = "krabit-composer-fields";
          wrapper.innerHTML = `
            <div class="krabit-field-row">
              <div class="krabit-field">
                <label for="krabit-price">
                  Price <span class="required-star">*</span>
                </label>
                <input
                  type="number"
                  id="krabit-price"
                  placeholder="e.g. 5000"
                  min="0"
                  step="0.01"
                />
                <span class="krabit-field-error" id="krabit-price-error">
                  Please enter a valid price.
                </span>
              </div>
              <div class="krabit-field">
                <label for="krabit-url">
                  URL <span class="required-star">*</span>
                </label>
                <input
                  type="url"
                  id="krabit-url"
                  placeholder="https://example.com"
                />
                <span class="krabit-field-error" id="krabit-url-error">
                  Please enter a valid URL (include https://).
                </span>
              </div>
            </div>
          `;

          // Insert after the title input
          titleInput.insertAdjacentElement("afterend", wrapper);
        },
      });

      // ─── Validate and embed on save ───────────────────────────────────
      api.modifyClass("model:composer", {
        pluginId: "krabit-composer-fields",

        save(...args) {
          const categoryId = this.get("categoryId");

          if (isAllowedCategory(categoryId)) {
            const priceInput = document.getElementById("krabit-price");
            const urlInput = document.getElementById("krabit-url");

            if (priceInput && urlInput) {
              let valid = true;

              // Validate price
              const price = priceInput.value.trim();
              if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
                priceInput.classList.add("krabit-error");
                valid = false;
              } else {
                priceInput.classList.remove("krabit-error");
              }

              // Validate URL
              const url = urlInput.value.trim();
              try {
                if (!url) throw new Error("empty");
                new URL(url);
                urlInput.classList.remove("krabit-error");
              } catch {
                urlInput.classList.add("krabit-error");
                valid = false;
              }

              if (!valid) {
                document
                  .getElementById("krabit-composer-fields")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
                return Promise.reject("krabit-validation-failed");
              }

              // Append to post body
              const currentReply = this.get("reply") || "";
              if (!currentReply.includes("**Price:**")) {
                this.set(
                  "reply",
                  `${currentReply}\n\n---\n**Price:** ${price}\n**URL:** ${url}`
                );
              }
            }
          }

          return this._super(...arguments);
        },
      });
    });
  },
};
