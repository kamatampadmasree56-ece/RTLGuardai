module faulty_design (
    input clk,
    input rst,
    input [7:0] data_in,
    output reg [7:0] data_out,
    output reg [7:0] status_val
);

reg [7:0] buffer  // Missing semicolon

always @(posedge clk)
    if (rst)
        data_out = 8'b0;  // Blocking assignment inside sequential block, missing begin/end
    else
        data_out = data_in;  // Blocking assignment inside sequential block

always @(*)
    status_val <= data_out;  // Non-blocking assignment in combinational block, missing begin/end

endmodule
