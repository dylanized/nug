// When document is loaded, print message
$(document).ready(function () {
  // Display dummy message
  console.log("hello world");
  // For each piece of copyable text, mount a click event
  $(".clippy").each(function () {
    $(this).click(function () {
      // Cache the text, then try to copy to clipboard or show error msg
      const payload = $(this).text();
      navigator.clipboard.writeText(payload).then(
        function () {
          console.info(`Copied ${payload}`);
        },
        function () {
          console.error(
            `Failed to copy ${payload}. Check permissions for clipboard`,
          );
        },
      );
    });
  });
});
