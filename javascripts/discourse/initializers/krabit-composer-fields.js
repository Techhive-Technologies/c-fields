import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "krabit-composer-fields",
  initialize() {
    withPluginApi("0.8.31", (api) => {

      function getAllowedCategoryIds() {
        const raw = settings.krabit_category_ids || "";
        return raw
          .split(",")
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !isNaN(id) && id > 0);
      }

      function getCurrentCategoryId() {
        // Try multiple selectors Discourse uses across versions
        const selectors = [
          ".composer-fields .category-input input[type=hidden]",
          "#reply-control input[name='categoryId']",
          ".composer-popup input[name='categoryId']",
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.value) return parseInt(el.value, 10);
        }

        // Fallback: read from Discourse app state
        try {
          const container = window.__container__ || Discourse.__container__;
          if (container) {
            const controller = container.lookup("controller:composer");
            if (controller) {
              const catId = controller.get("model.categoryId");
              if (catId) return parseInt(catId, 10);
            }
          }
        } catch (e) {
          // ignore
        }
        return null;
      }

      function isAllowedCategory() {
        const allowed = getAllowedCategoryIds();
        if (allowed.length === 0) return false;
        const current = getCurrentCategoryId();
        if (!current) return false;
        return allowed.includes(current);
      }

      function removeFields() {
        const el = document.getElementById("krabit-composer-fields");
        if (el) el.remove();
      }

      function injectFields() {
        if (document.getElementById("krabit-composer-fields")) return;

        // Try all known anchor points across Discourse versions
        const anchor =
          document.querySelector(".title-input") ||
          document.querySelector(".composer-fields .title") ||
          document.querySelector("#reply-control .title-and-category") ||
          document.querySelector("#reply-control .topic-title");

        if (!anchor) return;

        const div = document.createElement("div");
        div.id = "krabit-composer-fields";
        div.className = "krabit-composer-fields";
        div.innerHTML = `
          <div class="krabit-field-row">
            <div class="krabit-field">
              <label for="krabit-price">Price <span class="required-star">*</span></label>
              <input type="number" id="krabit-price" placeholder="e.g. 5000" min="0" step="0.01" />
              <span class="krabit-field-error">Please enter a valid price.</span>
            </div>
            <div class="krabit-field">
              <label for="krabit-url">URL <span class="required-star">*</span></label>
              <input type="url" id="krabit-url" placeholder="https://example.com" />
              <span class="krabit-field-error">Please enter a valid URL (include https://).</span>
            </div>
          </div>
        `;

        anchor.insertAdjacentElement("afterend", div);
      }

      function checkAndToggle() {
        const composerOpen = !!document.querySelector("#reply-control.open, .composer-popup");
        if (!composerOpen) {
          removeFields();
          return;
        }
        if (isAllowedCategory()) {
          injectFields();
        } else {
          removeFields();
        }
      }

      // Watch the entire DOM for composer open/close and category changes
      const observer = new MutationObserver(() => {
        checkAndToggle();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "value"],
      });

      // Also intercept save via the composer model
      api.modifyClass("model:composer", {
        pluginId: "krabit-composer-fields",

        save(...args) {
          const categoryId = this.get("categoryId");
          const allowed = getAllowedCategoryIds();

          if (allowed.includes(parseInt(categoryId, 10))) {
            const priceInput = document.getElementById("krabit-price");
            const urlInput = document.getElementById("krabit-url");

            if (priceInput && urlInput) {
              let valid = true;

              const price = priceInput.value.trim();
              if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
                priceInput.classList.add("krabit-error");
                valid = false;
              } else {
                priceInput.classList.remove("krabit-error");
              }

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
