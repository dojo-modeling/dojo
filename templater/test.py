import unittest

from dojo import DojoClient

dojo = DojoClient()

MODEL_ID = "templater-test"

CONFIG = {
    "mode": "config",
    "content_id": "/path/to/config.json",
}
DIRECT = {
    "mode": "directive",
    "content_id": "python main.py --rain 0.9",
}
NEW_MODEL = {
    "id":           MODEL_ID,
    "name":         MODEL_ID,
    "family_name":  "test",
    "description":  "test",
    "image":        "",
    "category":     [],
    "maintainer":   {
        "name":     "",
        "email":    "",
    },
    "parameters":   [],
    "outputs":   [],
}
TEST_PARAMS = []
for i in range(6):
    param = {
        "type": f"test-{i}",
    }
    if i < 3:
        param["content_id"] =   CONFIG["content_id"]
        param["mode"] =         CONFIG["mode"]
    else:
        param["content_id"] =   DIRECT["content_id"]
        param["mode"] =         DIRECT["mode"]

    TEST_PARAMS.append(param)

class TestDojo(unittest.TestCase):

    def setUp(self):
        # recreate model
        dojo._make_request("POST", "/models", body=NEW_MODEL)

    def tearDown(self):
        # reset params
        dojo.update_params(MODEL_ID, CONFIG["mode"], CONFIG["content_id"], [])
        dojo.update_params(MODEL_ID, DIRECT["mode"], DIRECT["content_id"], [])

    def test_load_params(self):
        all_params = dojo.load_params(MODEL_ID)
        self.assertEqual([], all_params)

    def test_add_params(self):

        dojo.update_params(MODEL_ID, CONFIG["mode"], CONFIG["content_id"], TEST_PARAMS)

        dojo_params = dojo.load_params(MODEL_ID)
        for param in TEST_PARAMS:
            self.assertIn(param, dojo_params)

    def test_update_params(self):

        # no dojo validation on params, use field name that doesn't get mapped
        new_params_config = TEST_PARAMS[:3]
        dojo.update_params(MODEL_ID, CONFIG["mode"], CONFIG["content_id"], new_params_config)

        new_params_direct = TEST_PARAMS[3:]
        dojo.update_params(MODEL_ID, DIRECT["mode"], DIRECT["content_id"], new_params_direct)

        dojo_params = dojo.load_params(MODEL_ID)
        for param in new_params_config:
            self.assertIn(param, dojo_params)
        for param in new_params_direct:
            self.assertIn(param, dojo_params)


if __name__ == '__main__':
    unittest.main()
