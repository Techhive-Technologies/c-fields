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
        try {
          const container = window.__container__ || Discourse.__container__;
          if (container) {
            const controller = container.lookup("controller:composer");
            if (controller) {
              const catId = controller.get("model.categoryId");
              if (catId) return parseInt(catId, 10);
            }
          }
        } catch (e) {}
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

        // Target the tags row specifically — fields go AFTER this
        const anchor =
          document.querySelector("#reply-control .tags-input") ||
          document.querySelector("#reply-control .mini-tag-chooser") ||
          document.querySelector("#reply-control .composer-fields .tag-chooser") ||
          document.querySelector("#reply-control .category-and-tags") ||
          document.querySelector("#reply-control .category-input");

        if (!anchor) return;

        // Walk up to the containing row if needed
        const insertAfter = anchor.closest(".composer-row, .category-and-tags, .category-input") || anchor;

        const div = document.createElement("div");
        div.id = "krabit-composer-fields";
        div.className = "krabit-composer-fields";
        div.innerHTML = `
          <div class="krabit-field-row">
            <div class="krabit-field">
              <input type="text" id="krabit-price" placeholder="Price or Open to Offers" min=" />
              <span class="krabit-field-error">Please enter a valid offer.</span>
            </div>
            <div class="krabit-field">
              <input type="text" id="krabit-url" placeholder="Link or @Handle" />
              <span class="krabit-field-error">Please enter a valid link.</span>
            </div>
          </div>
        `;

        insertAfter.insertAdjacentElement("afterend", div);
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

      const observer = new MutationObserver(() => {
        checkAndToggle();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "value"],
      });

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
