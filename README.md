Browser Chat Widget SDK
========================

### CDN

```html
<script src="https://cdn.jsdelivr.net/gh/qyroai/qyro-browser-chat-widget/js/chat-widget.js"></script>
```

### Example Usage


```html

<!doctype html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Embedded Chat</title>
</head>

<body>
    <h1>Embedded Chat Example</h1>
    <p>This is an example of embedding the chat widget into a web page.</p>

    <script src="https://cdn.jsdelivr.net/gh/qyroai/qyro-browser-chat-widget/js/chat-widget.js"></script>
    <script>
        initChatWidget({
            baseUrl: "https://qyroai.com",
            assistantId: "123",
            theme: "light",                           // "light" (default) or "dark"
            getToken: async () => {
                return "generatedtoken"               // get it from your backend server
            },
            title: "Integration Assistant"
        });
    </script>

</body>

</html>

```
